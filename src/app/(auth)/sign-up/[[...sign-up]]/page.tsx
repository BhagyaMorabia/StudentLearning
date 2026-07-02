import { SignUp } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignUp
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: '#3b6fe0',
            colorBackground: '#0a0a0c',
            colorText: '#f2f2f4',
          },
        }}
      />
    </div>
  );
}
