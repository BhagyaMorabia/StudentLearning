import { SignUp } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-surface-base flex items-center justify-center p-6">
      <SignUp
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: '#3B82F6',
            colorBackground: '#0A0A0A',
            colorText: '#FFFFFF',
          },
        }}
      />
    </main>
  );
}
