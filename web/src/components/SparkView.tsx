import {
  FormEvent,
  useEffect,
  useRef,
  useState
} from 'react'

import type {
  MemberConnection
} from '../features/connections/connections'

import {
  loadSparkMessages,
  sendSparkMessage,
  subscribeToSparkMessages,
  type SparkMessage
} from '../features/messaging/sparkMessaging'

type Props = {
  connection: MemberConnection
  onBack: () => void
}

export default function SparkView({
  connection,
  onBack
}: Props) {
  const [
    messages,
    setMessages
  ] = useState<SparkMessage[]>([])

  const [
    body,
    setBody
  ] = useState('')

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    sending,
    setSending
  ] = useState(false)

  const [
    error,
    setError
  ] = useState<string | null>(null)

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    )

  const conversationId =
    connection.conversationId

  useEffect(() => {
    if (!conversationId) {
      setLoading(false)
      setError(
        'This connection does not have an active Spark™ conversation.'
      )
      return
    }

    let active = true

    setLoading(true)
    setError(null)

    void loadSparkMessages(
      conversationId
    )
      .then((result) => {
        if (!active) return
        setMessages(result)
      })
      .catch((caught) => {
        if (!active) return

        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load Spark™.'
        )
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    const unsubscribe =
      subscribeToSparkMessages(
        conversationId,
        (message) => {
          setMessages(
            (current) => {
              if (
                current.some(
                  (item) =>
                    item.id === message.id
                )
              ) {
                return current
              }

              return [
                ...current,
                message
              ]
            }
          )
        },
        setError
      )

    return () => {
      active = false
      unsubscribe()
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth'
    })
  }, [messages.length])

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (
      !conversationId ||
      sending ||
      !body.trim()
    ) {
      return
    }

    setSending(true)
    setError(null)

    try {
      const message =
        await sendSparkMessage(
          conversationId,
          body
        )

      setBody('')

      setMessages(
        (current) =>
          current.some(
            (item) =>
              item.id === message.id
          )
            ? current
            : [
                ...current,
                message
              ]
      )
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to send message.'
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="spark-shell">
      <header className="spark-header">
        <button
          className="secondary"
          type="button"
          onClick={onBack}
        >
          Back
        </button>

        <div>
          <div className="eyebrow">
            Spark™
          </div>

          <h2>
            {connection.displayName}
          </h2>
        </div>
      </header>

      <div className="spark-panel">
        <div className="spark-messages">
          {loading ? (
            <div className="empty-state">
              Loading Spark™…
            </div>
          ) : messages.length === 0 ? (
            <div className="spark-empty">
              <div className="match-heart">
                ♥
              </div>

              <h3>
                Start the conversation.
              </h3>

              <p>
                You both chose to explore this.
                Say hello.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.isMine
                    ? 'message-row mine'
                    : 'message-row theirs'
                }
              >
                <div className="message-bubble">
                  <p>
                    {message.body}
                  </p>

                  <span>
                    {message.createdAtLabel}
                  </span>
                </div>
              </div>
            ))
          )}

          <div ref={bottomRef} />
        </div>

        <form
          className="spark-composer"
          onSubmit={submit}
        >
          <textarea
            value={body}
            onChange={(event) =>
              setBody(
                event.target.value
              )
            }
            placeholder={`Message ${connection.displayName}`}
            maxLength={4000}
            rows={2}
            disabled={
              sending ||
              !conversationId
            }
          />

          <button
            className="spark-send"
            type="submit"
            disabled={
              sending ||
              !body.trim() ||
              !conversationId
            }
          >
            {sending
              ? 'Sending…'
              : 'Send'}
          </button>
        </form>
      </div>

      {error && (
        <p className="error">
          {error}
        </p>
      )}
    </section>
  )
}
