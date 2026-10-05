import { useEffect, useState } from 'react'
import {
  FEEDBACK_KINDS, fetchMyMessages, fetchUpdates, sendFeedback, sendMessage, validateFeedback, validateMessage,
} from './contact.js'
import { formatDateTime } from './orderStatus.js'
import { MailIcon } from './icons.jsx'

const RATING_VALUES = [1, 2, 3, 4, 5]
const FEEDBACK_LABELS = { review: 'Your review', complaint: 'Your complaint', compliment: 'Your compliment' }
// The Contact section: the shop's updates, a message to the shop, and a review, complaint or
// compliment. Messages and feedback are seen only by the shop; the updates are for everyone.
export default function ContactShop() {
  const [updates, setUpdates] = useState([])
  const [newsStatus, setNewsStatus] = useState('loading')
  const [newsError, setNewsError] = useState('')
  const [threads, setThreads] = useState([])
  const [mineStatus, setMineStatus] = useState('loading')
  const [mineError, setMineError] = useState('')

  const [subject, setSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [messageErrors, setMessageErrors] = useState({})
  const [messageBusy, setMessageBusy] = useState(false)
  const [messageSent, setMessageSent] = useState('')
  const [messageProblem, setMessageProblem] = useState('')

  const [kind, setKind] = useState('')
  const [rating, setRating] = useState('')
  const [feedbackBody, setFeedbackBody] = useState('')
  const [feedbackErrors, setFeedbackErrors] = useState({})
  const [feedbackBusy, setFeedbackBusy] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState('')
  const [feedbackProblem, setFeedbackProblem] = useState('')

  useEffect(() => {
    let active = true
    fetchUpdates().then((result) => {
      if (!active) return
      if (result.error) {
        setNewsError(result.error.text)
        setNewsStatus('error')
      } else {
        setUpdates(result.updates)
        setNewsStatus('ready')
      }
    })
    loadMessages()
    return () => { active = false }
  }, [])

  // The person's own messages, each with the shop's replies.
  async function loadMessages() {
    const result = await fetchMyMessages()
    if (result.error) {
      setMineError(result.error.text)
      setMineStatus('error')
    } else {
      setThreads(result.threads)
      setMineStatus('ready')
    }
  }

  function changeSubject(event) {
    setSubject(event.target.value)
    setMessageErrors((current) => ({ ...current, subject: '' }))
  }

  function changeMessageBody(event) {
    setMessageBody(event.target.value)
    setMessageErrors((current) => ({ ...current, body: '' }))
  }

  function chooseKind(value) {
    setKind(value)
    setRating('')
    setFeedbackErrors((current) => ({ ...current, kind: '', rating: '' }))
  }

  function changeRating(value) {
    setRating(value)
    setFeedbackErrors((current) => ({ ...current, rating: '' }))
  }

  function changeFeedbackBody(event) {
    setFeedbackBody(event.target.value)
    setFeedbackErrors((current) => ({ ...current, body: '' }))
  }

  async function submitMessage(event) {
    event.preventDefault()
    setMessageSent('')
    setMessageProblem('')
    const errors = validateMessage({ subject, body: messageBody })
    setMessageErrors(errors)
    if (Object.keys(errors).length > 0) return
    setMessageBusy(true)
    const result = await sendMessage({ subject, body: messageBody })
    setMessageBusy(false)
    if (result.errors) setMessageErrors(result.errors)
    else if (result.error) setMessageProblem(result.error.text)
    else {
      setSubject('')
      setMessageBody('')
      setMessageSent('Your message has been sent to the shop.')
      await loadMessages()
    }
  }

  async function submitFeedback(event) {
    event.preventDefault()
    setFeedbackSent('')
    setFeedbackProblem('')
    const errors = validateFeedback({ kind, rating, body: feedbackBody })
    setFeedbackErrors(errors)
    if (Object.keys(errors).length > 0) return
    setFeedbackBusy(true)
    const result = await sendFeedback({ kind, rating, body: feedbackBody })
    setFeedbackBusy(false)
    if (result.errors) setFeedbackErrors(result.errors)
    else if (result.error) setFeedbackProblem(result.error.text)
    else {
      setKind('')
      setRating('')
      setFeedbackBody('')
      setFeedbackSent('Thank you — your feedback has been sent to the shop.')
    }
  }

  return (
    <section className="contact no-print" id="contact" aria-labelledby="contact-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Talk to the shop</p>
          <h2 id="contact-heading"><MailIcon size={22} /> Contact the shop</h2>
        </div>
      </div>
      <p className="hint">Messages and feedback are seen only by the shop.</p>

      <div className="contact-sections">
        <div className="panel">
          <h3>Your messages</h3>
          {mineStatus === 'loading' && <p className="hint" role="status">Loading your messages…</p>}
          {mineStatus === 'error' && <p className="error" role="alert">{mineError}</p>}
          {mineStatus === 'ready' && threads.length === 0 && (
            <p className="hint">You have not sent any messages yet.</p>
          )}
          {threads.length > 0 && (
            <ul className="thread-list">
              {threads.map((thread) => (
                <li className="thread" key={thread.id}>
                  <h4>{thread.subject}</h4>
                  <p className="thread-date">You wrote this on {formatDateTime(thread.created_at)}</p>
                  <p className="thread-body">{thread.body}</p>
                  {thread.replies.length === 0 && <p className="hint">No reply from the shop yet.</p>}
                  {thread.replies.map((reply) => (
                    <blockquote className="thread-reply" key={reply.id}>
                      <p className="thread-date">Reply from the shop, {formatDateTime(reply.created_at)}</p>
                      <p>{reply.body}</p>
                    </blockquote>
                  ))}
                </li>
              ))}
            </ul>
          )}
          {threads.length > 0 && (
            <div className="actions">
              <button type="button" className="secondary" onClick={loadMessages}>Check for replies</button>
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Write a message</h3>
          <form onSubmit={submitMessage} noValidate>
            <label htmlFor="message-subject">Subject</label>
            <input id="message-subject" name="subject" value={subject} onChange={changeSubject}
              maxLength={120} autoComplete="off" aria-invalid={Boolean(messageErrors.subject)}
              aria-describedby={messageErrors.subject ? 'message-subject-error' : undefined} />
            {messageErrors.subject && (
              <p className="error" id="message-subject-error" role="alert">{messageErrors.subject}</p>
            )}

            <label htmlFor="message-body">Your message</label>
            <textarea id="message-body" name="body" rows="5" value={messageBody} onChange={changeMessageBody}
              maxLength={3000} aria-invalid={Boolean(messageErrors.body)}
              aria-describedby={messageErrors.body ? 'message-body-error' : undefined} />
            {messageErrors.body && (
              <p className="error" id="message-body-error" role="alert">{messageErrors.body}</p>
            )}
            {messageProblem && <p className="error" role="alert">{messageProblem}</p>}
            <div className="actions">
              <button type="submit" disabled={messageBusy}>{messageBusy ? 'Sending…' : 'Send message'}</button>
            </div>
            {messageSent && <p className="hint" role="status">{messageSent}</p>}
          </form>
        </div>
<details className="panel contact-updates">
          <summary>
            Updates from the shop
            {updates.length > 0 && <span className="updates-count">{updates.length}</span>}
          </summary>
          <div className="updates-body">
            {newsStatus === 'loading' && <p className="hint" role="status">Loading updates…</p>}
            {newsStatus === 'error' && <p className="error" role="alert">{newsError}</p>}
            {newsStatus === 'ready' && updates.length === 0 && (
              <p className="hint">No updates yet. Check back soon.</p>
            )}
            {updates.length > 0 && (
              <div className="news-list">
                {updates.map((update) => (
                  <article className="news-item" key={update.id}>
                    <h4>{update.title}</h4>
                    <p className="news-date">{formatDateTime(update.created_at)}</p>
                    <p>{update.body}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </details>

        <div className="panel">
          <h3>Reviews, complaints and compliments</h3>
          <form onSubmit={submitFeedback} noValidate>
            <fieldset className="category">
              <legend>What are you writing about?</legend>
              {FEEDBACK_KINDS.map((option) => (
                <label className="radio" key={option.value}>
                  <input type="radio" name="feedback-kind" value={option.value} checked={kind === option.value}
                    onChange={() => chooseKind(option.value)} />
                  {option.label}
                </label>
              ))}
            </fieldset>
            {feedbackErrors.kind && <p className="error" role="alert">{feedbackErrors.kind}</p>}

            {kind === 'review' && (
              <fieldset className="category">
                <legend>Your rating</legend>
                {RATING_VALUES.map((stars) => (
                  <label className="radio" key={stars}>
                    <input type="radio" name="feedback-rating" value={stars} checked={rating === String(stars)}
                      onChange={() => changeRating(String(stars))} />
                    {stars} {stars === 1 ? 'star' : 'stars'}
                  </label>
                ))}
              </fieldset>
            )}
            {feedbackErrors.rating && <p className="error" role="alert">{feedbackErrors.rating}</p>}

            <label htmlFor="feedback-body">{FEEDBACK_LABELS[kind] ?? 'Your feedback'}</label>
            <textarea id="feedback-body" rows="5" value={feedbackBody} onChange={changeFeedbackBody}
              maxLength={3000} aria-invalid={Boolean(feedbackErrors.body)}
              aria-describedby={feedbackErrors.body ? 'feedback-body-error' : undefined} />
            {feedbackErrors.body && (
              <p className="error" id="feedback-body-error" role="alert">{feedbackErrors.body}</p>
            )}
            {feedbackProblem && <p className="error" role="alert">{feedbackProblem}</p>}
            <div className="actions">
              <button type="submit" disabled={feedbackBusy}>{feedbackBusy ? 'Sending…' : 'Send feedback'}</button>
            </div>
            {feedbackSent && <p className="hint" role="status">{feedbackSent}</p>}
          </form>
        </div>
      </div>
    </section>
  )
}
