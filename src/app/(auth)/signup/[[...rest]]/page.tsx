import { SignUp } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

const integrations = [
  { name: 'Google Calendar', icon: '📅', description: 'Sync meetings & deadlines' },
  { name: 'Notion', icon: '📝', description: 'Connect your workspace' },
  { name: 'Slack', icon: '💬', description: 'Team notifications' },
  { name: 'Linear', icon: '🎯', description: 'Track product tasks' },
];

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[#EDEFF7]">Get started</h1>
        <p className="mt-2 text-[#9DA2B3]">Meet your AI-powered cofounder</p>
      </div>

      {/* Integrations Section */}
      <div className="mb-8 w-full max-w-sm">
        <p className="text-center text-sm text-[#6E7180] mb-4">Works with your favorite tools</p>
        <div className="grid grid-cols-2 gap-3">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center gap-2 rounded-lg bg-[#1E1E24]/60 border border-[#40424D]/50 px-3 py-2"
            >
              <span className="text-lg">{integration.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#EDEFF7] truncate">{integration.name}</p>
                <p className="text-[10px] text-[#6E7180] truncate">{integration.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SignUp
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'bg-[#1E1E24] backdrop-blur border border-[#40424D] shadow-xl rounded-xl',
            headerTitle: 'text-[#EDEFF7]',
            headerSubtitle: 'text-[#9DA2B3]',
            socialButtonsBlockButton: 'bg-[#40424D] border-[#40424D] text-[#EDEFF7] hover:bg-[#6E7180] hover:border-[#6E7180]',
            socialButtonsBlockButtonText: 'text-[#EDEFF7]',
            dividerLine: 'bg-[#40424D]',
            dividerText: 'text-[#6E7180]',
            formFieldLabel: 'text-[#9DA2B3]',
            formFieldInput:
              'bg-[#040F13] border-[#40424D] text-[#EDEFF7] placeholder:text-[#6E7180] focus:border-[#FC6C00] focus:ring-[#FC6C00]/20',
            formButtonPrimary:
              'bg-[#FC6C00] hover:bg-[#FC6C00]/90 text-white font-medium shadow-lg shadow-[#FC6C00]/20',
            footerActionLink: 'text-[#0077F9] hover:text-[#0077F9]/80',
            identityPreviewText: 'text-[#EDEFF7]',
            identityPreviewEditButton: 'text-[#0077F9]',
            formFieldInputShowPasswordButton: 'text-[#9DA2B3] hover:text-[#EDEFF7]',
            otpCodeFieldInput: 'bg-[#040F13] border-[#40424D] text-[#EDEFF7]',
            formResendCodeLink: 'text-[#0077F9] hover:text-[#0077F9]/80',
            alert: 'bg-[#040F13] border-[#40424D] text-[#EDEFF7]',
            alertText: 'text-[#9DA2B3]',
          },
        }}
      />
    </div>
  );
}
