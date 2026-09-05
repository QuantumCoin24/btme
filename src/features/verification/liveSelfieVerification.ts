import {
  supabase,
} from '../../lib/supabase';

export type LiveSelfieStep =
  | 'neutral'
  | 'turn_left'
  | 'turn_right';

export type LiveSelfieChallenge = {
  challengeId: string;
  challengeVersion: 'v1';
  sequence: LiveSelfieStep[];
  expiresAt: string;
};

export type LiveSelfieEvidence = {
  step: LiveSelfieStep;
  faceCount: number;
  captureQuality: number;
  yaw: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

type ChallengeRow = {
  challenge_id: string;
  challenge_version: string;
  sequence: string[];
  expires_at: string;
};

export async function startLiveSelfieChallenge():
  Promise<LiveSelfieChallenge> {
  const {
    data,
    error,
  } = await supabase.rpc(
    'start_my_live_selfie_challenge',
  );

  if (error) {
    throw error;
  }

  const row =
    (Array.isArray(data)
      ? data[0]
      : data) as
      | ChallengeRow
      | null;

  if (
    !row ||
    row.challenge_version !== 'v1' ||
    !Array.isArray(row.sequence)
  ) {
    throw new Error(
      'BTME could not start live verification.',
    );
  }

  const sequence =
    row.sequence.filter(
      (
        value,
      ): value is LiveSelfieStep =>
        value === 'neutral' ||
        value === 'turn_left' ||
        value === 'turn_right',
    );

  if (
    sequence.length !==
      row.sequence.length
  ) {
    throw new Error(
      'BTME received an invalid verification challenge.',
    );
  }

  return {
    challengeId: row.challenge_id,
    challengeVersion: 'v1',
    sequence,
    expiresAt: row.expires_at,
  };
}

export async function completeLiveSelfieChallenge(
  challenge: LiveSelfieChallenge,
  steps: LiveSelfieEvidence[],
): Promise<void> {
  const {
    data,
    error,
  } = await supabase.functions.invoke(
    'live-selfie-verify',
    {
      body: {
        challengeId:
          challenge.challengeId,
        challengeVersion:
          challenge.challengeVersion,
        steps,
      },
    },
  );

  if (error) {
    throw error;
  }

  if (
    !data ||
    data.verified !== true
  ) {
    throw new Error(
      typeof data?.error === 'string'
        ? data.error
        : 'Live verification was not completed.',
    );
  }
}
