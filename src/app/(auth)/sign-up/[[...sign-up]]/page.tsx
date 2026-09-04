import { SignUp } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base">
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
    </div>
  );
}
