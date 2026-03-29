import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingSheet } from '../OnboardingSheet'

// createPortal renders into document.body in jsdom
const noop = () => {}

describe('OnboardingSheet', () => {
  it('renders headline and body text', () => {
    render(<OnboardingSheet onSignIn={noop} onAnonymous={noop} onDismiss={noop} />)
    expect(screen.getByText('Hilf der Community')).toBeInTheDocument()
    expect(screen.getByText(/Mit einem Konto/)).toBeInTheDocument()
  })

  it('calls onSignIn when primary CTA is clicked', async () => {
    const onSignIn = jest.fn()
    render(<OnboardingSheet onSignIn={onSignIn} onAnonymous={noop} onDismiss={noop} />)
    await userEvent.click(screen.getByRole('button', { name: /Jetzt anmelden/i }))
    expect(onSignIn).toHaveBeenCalledTimes(1)
  })

  it('calls onAnonymous when secondary CTA is clicked', async () => {
    const onAnonymous = jest.fn()
    render(<OnboardingSheet onSignIn={noop} onAnonymous={onAnonymous} onDismiss={noop} />)
    await userEvent.click(screen.getByRole('button', { name: /Anonym melden/i }))
    expect(onAnonymous).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when X button is clicked', async () => {
    const onDismiss = jest.fn()
    render(<OnboardingSheet onSignIn={noop} onAnonymous={noop} onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: /schließen/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
