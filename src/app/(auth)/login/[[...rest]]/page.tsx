import { SignIn } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[#EDEFF7]">Welcome back</h1>
        <p className="mt-2 text-[#9DA2B3]">Sign in to your Catalyst Launch account</p>
      </div>
      <SignIn
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
