import { useAuthActions } from "@convex-dev/auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SignInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type Step = "email" | { email: string }

export function SignInDialog({
  open,
  onOpenChange,
  onSuccess,
}: SignInDialogProps) {
  const { signIn } = useAuthActions()
  const [step, setStep] = useState<Step>("email")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setStep("email")
    setError(null)
  }

  const handleClose = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    try {
      await signIn("resend-otp", formData)
      setStep({ email })
    } catch {
      setError("Failed to send code")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    try {
      await signIn("resend-otp", formData)
      onSuccess?.()
      handleClose(false)
    } catch {
      setError("Invalid code")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "email" ? "Sign in" : "Enter code"}
          </DialogTitle>
          <DialogDescription>
            {step === "email"
              ? "Enter your email to save and sync your boards."
              : `We sent a code to ${step.email}`}
          </DialogDescription>
        </DialogHeader>

        {step === "email" && (
          <form
            onSubmit={handleEmailSubmit}
            className="flex flex-col gap-4 mt-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                disabled={isLoading}
                autoFocus
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send code"}
            </Button>
          </form>
        )}

        {typeof step === "object" && (
          <form
            onSubmit={handleCodeSubmit}
            className="flex flex-col gap-4 mt-4"
          >
            <input type="hidden" name="email" value={step.email} />
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                name="code"
                type="text"
                placeholder="12345678"
                autoComplete="one-time-code"
                required
                disabled={isLoading}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("email")}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </form>
        )}

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </DialogContent>
    </Dialog>
  )
}
