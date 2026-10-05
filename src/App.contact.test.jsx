import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'
import { fakeSupabase } from './test/fakeSupabase.js'

const setup = () => ({ user: userEvent.setup({ applyAccept: false }), ...render(<App />) })
const contact = () => within(screen.getByRole('region', { name: /contact, updates and feedback/i }))
const me = () => fakeSupabase.state.users[0]
const postUpdate = (title, body) =>
  fakeSupabase.state.news.push({ id: crypto.randomUUID(), title, body, created_at: '2026-10-01T09:00:00.000Z' })

describe('the contact section', () => {
  it('is in the navigation and reads the shop updates', async () => {
    postUpdate('Saturday seedlings', 'Fresh herb and vegetable seedlings arrive every Saturday morning.')
    setup()
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '#contact')
    expect(await screen.findByRole('heading', { name: 'Saturday seedlings' })).toBeInTheDocument()
    expect(screen.getByText(/arrive every Saturday/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Write a message to the shop' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Reviews, complaints and compliments' })).toBeInTheDocument()
  })

  it('says so when the shop has posted no updates', async () => {
    setup()
    expect(await screen.findByText(/no updates yet/i)).toBeInTheDocument()
  })

  it('names supabase/contact.sql when it is not set up', async () => {
    fakeSupabase.state.contactMissing = true
    const { user } = setup()
    await screen.findByText(/supabase\/contact\.sql/i)
    await user.type(contact().getByLabelText('Subject'), 'Delivery question')
    await user.type(contact().getByLabelText('Your message'), 'Can I collect on Sunday morning?')
    await user.click(contact().getByRole('button', { name: 'Send message' }))
    expect(contact().getAllByText(/supabase\/contact\.sql/i)).toHaveLength(2)
    expect(fakeSupabase.state.messages).toEqual([])
  })

  it('explains an empty message and sends nothing', async () => {
    const { user } = setup()
    await screen.findByText(/no updates yet/i)
    await user.click(contact().getByRole('button', { name: 'Send message' }))
    expect(contact().getByText('Enter a subject of at least 3 characters.')).toBeInTheDocument()
    expect(contact().getByText(/write at least 10 characters/i)).toBeInTheDocument()
    expect(fakeSupabase.state.messages).toEqual([])
  })

  it('sends a message to the shop and clears the form', async () => {
    const { user } = setup()
    await user.type(contact().getByLabelText('Subject'), '  Delivery question  ')
    await user.type(contact().getByLabelText('Your message'), '  Can I collect on Sunday morning?  ')
    await user.click(contact().getByRole('button', { name: 'Send message' }))
    expect(await screen.findByText('Your message has been sent to the shop.')).toBeInTheDocument()
    expect(fakeSupabase.state.messages).toHaveLength(1)
    expect(fakeSupabase.state.messages[0]).toMatchObject({
      subject: 'Delivery question', body: 'Can I collect on Sunday morning?', user_id: me().id,
    })
    expect(contact().getByLabelText('Subject')).toHaveValue('')
  })

  it('asks for a rating only for a review', async () => {
    const { user } = setup()
    await user.click(contact().getByRole('button', { name: 'Send feedback' }))
    expect(contact().getByText('Choose a review, complaint or compliment.')).toBeInTheDocument()
    expect(contact().queryByRole('group', { name: 'Your rating' })).not.toBeInTheDocument()

    await user.click(contact().getByLabelText('A review'))
    expect(contact().getByRole('group', { name: 'Your rating' })).toBeInTheDocument()
    await user.click(contact().getByRole('button', { name: 'Send feedback' }))
    expect(contact().getByText('Choose a rating from 1 to 5.')).toBeInTheDocument()
    expect(fakeSupabase.state.feedback).toEqual([])
  })

  it('sends a review with its rating and a complaint without one', async () => {
    const { user } = setup()
    await user.click(contact().getByLabelText('A review'))
    await user.click(contact().getByLabelText('4 stars'))
    await user.type(contact().getByLabelText('Your review'), 'The peace lily I ordered was healthy and well packed.')
    await user.click(contact().getByRole('button', { name: 'Send feedback' }))
    expect(await screen.findByText(/your feedback has been sent/i)).toBeInTheDocument()
    expect(fakeSupabase.state.feedback[0]).toMatchObject({ kind: 'review', rating: 4, user_id: me().id })

    await user.click(contact().getByLabelText('A complaint'))
    expect(contact().queryByRole('group', { name: 'Your rating' })).not.toBeInTheDocument()
    await user.type(contact().getByLabelText('Your complaint'), 'The collection point was hard to find on arrival.')
    await user.click(contact().getByRole('button', { name: 'Send feedback' }))
    expect(await screen.findByText(/your feedback has been sent/i)).toBeInTheDocument()
    expect(fakeSupabase.state.feedback[1]).toMatchObject({ kind: 'complaint', rating: null })
  })

  it('explains a network failure without losing the words', async () => {
    const { user } = setup()
    await screen.findByText(/no updates yet/i)
    fakeSupabase.state.offline = true
    await user.type(contact().getByLabelText('Subject'), 'Delivery question')
    await user.type(contact().getByLabelText('Your message'), 'Can I collect on Sunday morning?')
    await user.click(contact().getByRole('button', { name: 'Send message' }))
    expect(await contact().findByText(/offline or the server could not be reached/i)).toBeInTheDocument()
    expect(contact().getByLabelText('Subject')).toHaveValue('Delivery question')
  })
})
