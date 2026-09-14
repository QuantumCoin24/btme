import { supabase } from '../../lib/supabase'

const PROFILE_MEDIA_BUCKET =
  'profile-media'

const MAX_PROFILE_PHOTO_BYTES =
  10 * 1024 * 1024

const ALLOWED_MIME_TYPES =
  new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ])

const ALLOWED_EXTENSIONS =
  new Set([
    'jpg',
    'jpeg',
    'png',
    'webp',
    'heic',
    'heif'
  ])

export type ProfilePhoto = {
  id: string
  storagePath: string
  position: number
  isHero: boolean
  signedUrl: string
}

type ProfilePhotoRow = {
  id: string
  storage_path: string
  position: number
  is_hero: boolean
}

type ExistingPhotoRow = {
  id: string
  storage_path: string
  is_hero: boolean
}

async function requireUserId() {
  const {
    data: { user },
    error
  } =
    await supabase.auth.getUser()

  if (error) {
    throw error
  }

  if (!user) {
    throw new Error(
      'Your session has expired.'
    )
  }

  return user.id
}

function extensionForFile(
  file: File
) {
  const extension =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase()

  if (
    extension &&
    ALLOWED_EXTENSIONS.has(
      extension
    )
  ) {
    return extension === 'jpeg'
      ? 'jpg'
      : extension
  }

  switch (
    file.type.toLowerCase()
  ) {
    case 'image/png':
      return 'png'

    case 'image/webp':
      return 'webp'

    case 'image/heic':
      return 'heic'

    case 'image/heif':
      return 'heif'

    default:
      return 'jpg'
  }
}

function validateFile(
  file: File
) {
  if (
    file.size >
    MAX_PROFILE_PHOTO_BYTES
  ) {
    throw new Error(
      'That photo is larger than 10 MB.'
    )
  }

  if (
    file.type &&
    !ALLOWED_MIME_TYPES.has(
      file.type.toLowerCase()
    )
  ) {
    throw new Error(
      'Choose a JPEG, PNG, WebP, HEIC or HEIF image.'
    )
  }

  const extension =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase()

  if (
    extension &&
    !ALLOWED_EXTENSIONS.has(
      extension
    )
  ) {
    throw new Error(
      'Choose a JPEG, PNG, WebP, HEIC or HEIF image.'
    )
  }
}

async function createSignedUrl(
  storagePath: string
) {
  const { data, error } =
    await supabase.storage
      .from(
        PROFILE_MEDIA_BUCKET
      )
      .createSignedUrl(
        storagePath,
        60 * 60
      )

  if (error) {
    throw error
  }

  return data.signedUrl
}

async function hydratePhoto(
  row: ProfilePhotoRow
): Promise<ProfilePhoto> {
  return {
    id:
      row.id,

    storagePath:
      row.storage_path,

    position:
      row.position,

    isHero:
      row.is_hero,

    signedUrl:
      await createSignedUrl(
        row.storage_path
      )
  }
}

export async function loadProfilePhotos():
  Promise<ProfilePhoto[]> {

  const userId =
    await requireUserId()

  const { data, error } =
    await supabase
      .from('profile_photos')
      .select(
        'id, storage_path, position, is_hero'
      )
      .eq(
        'member_id',
        userId
      )
      .order(
        'position',
        {
          ascending: true
        }
      )

  if (error) {
    throw error
  }

  return Promise.all(
    (
      data ?? []
    ).map(
      (row) =>
        hydratePhoto(
          row as ProfilePhotoRow
        )
    )
  )
}

async function removeStorageObject(
  storagePath: string
) {
  const { error } =
    await supabase.storage
      .from(
        PROFILE_MEDIA_BUCKET
      )
      .remove([
        storagePath
      ])

  if (error) {
    console.warn(
      '[BTME Web] profile media cleanup failed:',
      error.message
    )
  }
}

export async function saveProfilePhoto(
  position: number,
  file: File
): Promise<ProfilePhoto> {

  if (
    !Number.isInteger(position) ||
    position < 1 ||
    position > 6
  ) {
    throw new Error(
      'Profile photo position must be between 1 and 6.'
    )
  }

  validateFile(file)

  const userId =
    await requireUserId()

  const isHero =
    position === 1

  const {
    data: existingData,
    error: existingError
  } =
    await supabase
      .from('profile_photos')
      .select(
        'id, storage_path, is_hero'
      )
      .eq(
        'member_id',
        userId
      )
      .eq(
        'position',
        position
      )
      .maybeSingle()

  if (existingError) {
    throw existingError
  }

  const existing =
    existingData
      ? existingData as ExistingPhotoRow
      : null

  const extension =
    extensionForFile(file)

  const storagePath =
    `${userId}/${position}-${Date.now()}.${extension}`

  const {
    error: uploadError
  } =
    await supabase.storage
      .from(
        PROFILE_MEDIA_BUCKET
      )
      .upload(
        storagePath,
        file,
        {
          contentType:
            file.type ||
            undefined,

          upsert:
            false
        }
      )

  if (uploadError) {
    throw uploadError
  }

  let existingRowDeleted =
    false

  try {
    if (existing) {
      const {
        error: deleteError
      } =
        await supabase
          .from('profile_photos')
          .delete()
          .eq(
            'id',
            existing.id
          )
          .eq(
            'member_id',
            userId
          )

      if (deleteError) {
        throw deleteError
      }

      existingRowDeleted =
        true
    }

    if (isHero) {
      const {
        error: heroError
      } =
        await supabase
          .from('profile_photos')
          .update({
            is_hero: false
          })
          .eq(
            'member_id',
            userId
          )
          .eq(
            'is_hero',
            true
          )

      if (heroError) {
        throw heroError
      }
    }

    const {
      data: insertedData,
      error: insertError
    } =
      await supabase
        .from('profile_photos')
        .insert({
          member_id:
            userId,

          storage_path:
            storagePath,

          position,

          is_hero:
            isHero
        })
        .select(
          'id, storage_path, position, is_hero'
        )
        .single()

    if (insertError) {
      throw insertError
    }

    if (existing) {
      await removeStorageObject(
        existing.storage_path
      )
    }

    return hydratePhoto(
      insertedData as ProfilePhotoRow
    )
  } catch (error) {
    await removeStorageObject(
      storagePath
    )

    if (
      existing &&
      existingRowDeleted
    ) {
      const {
        error: restoreError
      } =
        await supabase
          .from('profile_photos')
          .insert({
            member_id:
              userId,

            storage_path:
              existing.storage_path,

            position,

            is_hero:
              existing.is_hero
          })

      if (restoreError) {
        console.warn(
          '[BTME Web] failed to restore replaced photo metadata:',
          restoreError.message
        )
      }
    }

    throw error
  }
}

export async function removeProfilePhoto(
  photo: ProfilePhoto
) {
  const userId =
    await requireUserId()

  const {
    error
  } =
    await supabase
      .from('profile_photos')
      .delete()
      .eq(
        'id',
        photo.id
      )
      .eq(
        'member_id',
        userId
      )

  if (error) {
    throw error
  }

  await removeStorageObject(
    photo.storagePath
  )
}
