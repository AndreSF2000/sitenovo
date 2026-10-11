import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export function Modal({ open, onClose, title, children, testid }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            data-testid={`${testid}-backdrop`}
          />
          <motion.div
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="relative w-full rounded-t-2xl border border-line bg-ink-700 p-6 shadow-2xl sm:max-w-md sm:rounded-2xl"
            data-testid={testid}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-cream">{title}</h3>
              <button
                onClick={onClose}
                data-testid={`${testid}-close`}
                className="rounded-full p-1.5 text-cream-mute transition-colors hover:bg-ink-600 hover:text-cream"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
