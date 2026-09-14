import {
  Component,
  type ErrorInfo,
  type ReactNode
} from 'react'

type Props = {
  children: ReactNode
}

type State = {
  failed: boolean
}

export default class AppErrorBoundary
  extends Component<Props, State> {

  state: State = {
    failed: false
  }

  static getDerivedStateFromError(): State {
    return {
      failed: true
    }
  }

  componentDidCatch(
    error: Error,
    info: ErrorInfo
  ) {
    console.error(
      'BTME web application error',
      error,
      info
    )
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="app-fatal-error">
          <section className="app-fatal-error-card">
            <div className="eyebrow">
              Better Than My Ex™
            </div>

            <h1>
              Something went wrong.
            </h1>

            <p>
              BTME™ could not load this part of the
              application. Your account has not been
              changed.
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.reload()
              }}
            >
              Reload BTME™
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
