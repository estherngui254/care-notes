import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'

function setup() {
  return { user: userEvent.setup({ applyAccept: false }), ...render(<App />) }
}

async function openReportForm(user) {
  await user.type(screen.getByLabelText(/plant name/i), 'Gardenia')
  await user.type(screen.getByLabelText(/other care/i), 'Acid soil')
  await user.click(screen.getByRole('button', { name: /save plant/i }))
  await user.click(screen.getByText(/^plant health/i))
  await user.click(screen.getByRole('button', { name: /report a problem/i }))
  return screen.getByRole('form', { name: /report a problem on gardenia/i })
}

async function chooseSymptoms(user, form, symptoms) {
  await user.click(within(form).getByRole('button', { name: /what do you see/i }))
  for (const symptom of symptoms) await user.click(within(form).getByLabelText(symptom))
  await user.keyboard('{Escape}')
}

describe('nutrient deficiency detection', () => {
  it('shows nutrient-only symptoms and a tip when a nutrient problem is suspected', async () => {
    const { user } = setup()
    const form = await openReportForm(user)
    await user.click(within(form).getByRole('button', { name: /what do you see/i }))
    expect(within(form).queryByLabelText('Purple or reddish tinge on leaves')).toBeInTheDocument()
    expect(within(form).queryByLabelText('Fine webbing on leaves')).toBeInTheDocument()
    await user.keyboard('{Escape}')

    await user.click(within(form).getByLabelText('Nutrient problem'))
    expect(within(form).getByText(/older leaves affected first/i)).toBeInTheDocument()
    await user.click(within(form).getByRole('button', { name: /what do you see/i }))
    expect(within(form).queryByLabelText('Purple or reddish tinge on leaves')).toBeInTheDocument()
    expect(within(form).queryByLabelText('Fine webbing on leaves')).not.toBeInTheDocument()
  })

  it('hides nutrient symptoms when a pest or disease is suspected', async () => {
    const { user } = setup()
    const form = await openReportForm(user)
    await user.click(within(form).getByLabelText('Pest or disease'))
    await user.click(within(form).getByRole('button', { name: /what do you see/i }))
    expect(within(form).queryByLabelText('Fine webbing on leaves')).toBeInTheDocument()
    expect(within(form).queryByLabelText('Purple or reddish tinge on leaves')).not.toBeInTheDocument()
  })

  it('drops chosen symptoms that no longer apply when the category changes', async () => {
    const { user } = setup()
    const form = await openReportForm(user)
    await chooseSymptoms(user, form, ['Purple or reddish tinge on leaves'])
    expect(within(form).getByRole('button', { name: /what do you see/i })).toHaveTextContent('1 selected')
    await user.click(within(form).getByLabelText('Pest or disease'))
    expect(within(form).getByRole('button', { name: /what do you see/i })).toHaveTextContent('Choose symptoms')
  })

  it('suggests a deficiency and gives a management plan', async () => {
    const { user } = setup()
    const form = await openReportForm(user)
    await user.click(within(form).getByLabelText('Nutrient problem'))
    await chooseSymptoms(user, form, ['Yellowing between veins on new leaves'])

    const matches = within(form).getByRole('region', { name: /possible matches/i })
    expect(within(matches).getAllByRole('listitem')[0]).toHaveTextContent('Iron deficiency')
    expect(within(matches).getByText('Nutrient deficiency')).toBeInTheDocument()
    await user.click(within(matches).getByRole('button', { name: /use iron deficiency/i }))
    await user.click(within(form).getByRole('button', { name: /save problem/i }))

    const list = screen.getByRole('list', { name: /problems on gardenia/i })
    expect(within(list).getByText('Iron deficiency')).toBeInTheDocument()
    expect(within(list).getByText(/do now/i)).toBeInTheDocument()
    expect(within(list).getByText(/prevent a repeat/i)).toBeInTheDocument()
    expect(within(list).getByText(/check again/i)).toBeInTheDocument()
    expect(within(list).getByText(/get help if/i)).toBeInTheDocument()
  })

  it('tracks completed management steps and keeps them after a remount', async () => {
    const { user, unmount } = setup()
    const form = await openReportForm(user)
    await user.selectOptions(within(form).getByLabelText('Suspected problem'), 'Nitrogen deficiency')
    await user.click(within(form).getByRole('button', { name: /save problem/i }))

    const list = screen.getByRole('list', { name: /problems on gardenia/i })
    expect(within(list).getByText(/\(0 of 4 done\)/)).toBeInTheDocument()
    await user.click(within(list).getByLabelText(/feed with a balanced liquid fertiliser/i))
    expect(within(list).getByText(/\(1 of 4 done\)/)).toBeInTheDocument()

    unmount()
    render(<App />)
    await user.click(screen.getByText(/^plant health/i))
    const again = screen.getByRole('list', { name: /problems on gardenia/i })
    expect(within(again).getByText(/\(1 of 4 done\)/)).toBeInTheDocument()
    expect(within(again).getByLabelText(/feed with a balanced liquid fertiliser/i)).toBeChecked()
  })

  it('offers every guide group and includes the nutrient deficiencies', async () => {
    setup()
    const guide = screen.getByRole('region', { name: /pest, disease and nutrient guide/i })
    for (const title of ['Pests', 'Diseases', 'Nutrient deficiencies', 'Care problems']) {
      expect(within(guide).getByRole('option', { name: title })).toBeInTheDocument()
    }
    expect(within(guide).getByRole('rowheader', { name: 'Magnesium deficiency' })).toBeInTheDocument()
    expect(within(guide).getByText(/nutrient tip/i)).toBeInTheDocument()
  })
})
