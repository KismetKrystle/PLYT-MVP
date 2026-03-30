import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service | Plyant',
    description: 'Terms and conditions for using Plyant.',
};

export default function TermsPage() {
    return (
        <main className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed">
            <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
            <p className="mb-10 text-[#6b6d61]">Last updated: March 30, 2026</p>

            <p className="mb-8">
                By using PLYT at{' '}
                <a className="underline" href="https://app.plyant.com">
                    app.plyant.com
                </a>
                , you agree to these Terms of Service. If you do not agree, please do not use the app.
            </p>

            <Section title="1. About PLYT">
                <p>PLYT is a food discovery and health guidance app that uses AI to provide personalized food recommendations based on your health profile. PLYT is currently in beta.</p>
            </Section>

            <Section title="2. Your Account">
                <ul className="list-disc space-y-1 pl-5">
                    <li>You must provide accurate information when creating your account</li>
                    <li>You are responsible for keeping your login credentials secure</li>
                    <li>You must be at least 13 years old to use PLYT</li>
                </ul>
            </Section>

            <Section title="3. Health Disclaimer">
                <p>PLYT provides general food and wellness information for informational purposes only. It is <strong>not a substitute for professional medical advice, diagnosis, or treatment</strong>. Always consult a qualified healthcare provider before making significant changes to your diet.</p>
            </Section>

            <Section title="4. Your Content">
                <p>Any health preferences or profile information you provide remains yours. By using PLYT, you grant us permission to use that information to personalize your experience within the app.</p>
            </Section>

            <Section title="5. Acceptable Use">
                <p>You agree not to:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Use PLYT for any unlawful purpose</li>
                    <li>Attempt to access other users&apos; accounts or data</li>
                    <li>Reverse engineer or misuse the platform</li>
                </ul>
            </Section>

            <Section title="6. Beta Use">
                <p>PLYT is currently in beta. Features may change, and we appreciate your patience and feedback as we improve the product.</p>
            </Section>

            <Section title="7. Limitation of Liability">
                <p>PLYT is provided &quot;as is.&quot; We are not liable for any damages arising from your use of the app, including any reliance on food or health information provided.</p>
            </Section>

            <Section title="8. Changes to These Terms">
                <p>We may update these terms as the app evolves. Continued use of PLYT after changes means you accept the updated terms.</p>
            </Section>

            <Section title="9. Contact">
                <p>
                    Questions about these terms? Email us at{' '}
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
