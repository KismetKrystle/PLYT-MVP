'use client';

import { motion } from 'framer-motion';
import { INTENT_META, IntentClassification } from '../../lib/intentClassifier';

type IntentLoaderProps = {
    classification: IntentClassification;
};

export default function IntentLoader({ classification }: IntentLoaderProps) {
    const meta = INTENT_META[classification.intent];
    const mixedMeta = classification.mixed ? INTENT_META[classification.mixed] : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="flex w-full justify-start"
        >
            <div className="max-w-[90%] rounded-2xl rounded-bl-none border border-emerald-100 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accentClass}`}>
                        <div className="h-4 w-4 rounded-full bg-white/90" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.badgeClass}`}>
                                {meta.label}
                            </span>
                            <span className="text-[11px] font-medium capitalize text-gray-400">
                                {classification.confidence} confidence
                            </span>
                            {mixedMeta ? (
                                <span className="text-[11px] text-gray-400">
                                    Mixed with {mixedMeta.label.toLowerCase()}
                                </span>
                            ) : null}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-gray-800">Navi is choosing the best response path.</p>
                        <p className="mt-1 text-sm text-gray-500">{meta.summary}</p>

                        <div className="mt-3 flex items-center gap-1.5">
                            {[0, 1, 2].map((index) => (
                                <motion.span
                                    key={index}
                                    animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: index * 0.14 }}
                                    className="h-2.5 w-2.5 rounded-full bg-emerald-400"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
