import { SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base">
      <SignIn
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: '#3B82F6',
            colorBackground: '#0A0A0A',
            colorText: '#FFFFFF',
          },
        }}
      />
    </div>
  );
}
