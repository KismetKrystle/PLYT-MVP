import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy | Plyant',
    description: 'How Plyant collects, uses, and protects your information.',
};

export default function PrivacyPage() {
    return (
        <main className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed">
            <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
            <p className="mb-10 text-[#6b6d61]">Last updated: March 30, 2026</p>

            <p className="mb-8">
                Welcome to PLYT (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). This Privacy Policy explains how
                we collect, use, and protect your information when you use our app at{' '}
                <a className="underline" href="https://app.plyant.com">
                    app.plyant.com
                </a>
                .
            </p>

            <Section title="1. Information We Collect">
                <ul className="list-disc space-y-1 pl-5">
                    <li><strong>Account information</strong> - your name and email address when you sign up (including via Google Sign-In)</li>
                    <li><strong>Health profile information</strong> - dietary preferences, health goals, and food preferences you voluntarily provide</li>
                    <li><strong>Usage data</strong> - how you interact with the app to improve your experience</li>
                </ul>
            </Section>

            <Section title="2. How We Use Your Information">
                <ul className="list-disc space-y-1 pl-5">
                    <li>To personalize your food recommendations and AI-powered health guidance</li>
                    <li>To create and manage your account</li>
                    <li>To communicate with you about your account or updates to the app</li>
                    <li>To improve PLYT&apos;s features and performance</li>
                </ul>
            </Section>

            <Section title="3. We Do Not">
                <ul className="list-disc space-y-1 pl-5">
                    <li>Sell your personal data to third parties</li>
                    <li>Share your health information without your consent</li>
                    <li>Use your data for advertising purposes</li>
                </ul>
            </Section>

            <Section title="4. Third-Party Services">
                <p>We use the following trusted third-party services to operate PLYT:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li><strong>Clerk</strong> - for authentication and account management</li>
                    <li><strong>Google</strong> - for optional Google Sign-In</li>
                    <li><strong>Railway</strong> - for secure backend hosting</li>
                </ul>
            </Section>

            <Section title="5. Data Security">
                <p>We take reasonable technical measures to protect your information. Your health data is stored securely and accessible only to you.</p>
            </Section>

            <Section title="6. Your Rights">
                <p>
                    You may request to access, update, or delete your data at any time by contacting us at{' '}
                    <a className="underline" href="mailto:hello@plyant.com">
                        hello@plyant.com
                    </a>
                    .
                </p>
            </Section>

            <Section title="7. Changes to This Policy">
                <p>We may update this policy as PLYT evolves. We&apos;ll notify you of significant changes via email or in-app notice.</p>
            </Section>

            <Section title="8. Contact">
                <p>
                    If you have questions about this policy, reach out to us at{' '}
                    <a className="underline" href="mailto:hello@plyant.com">
                        hello@plyant.com
                    </a>
                    .
                </p>
            </Section>
        </main>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">{title}</h2>
            {children}
        </section>
    );
}
