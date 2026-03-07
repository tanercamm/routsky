import type { ReactNode } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface CardProps {
    children: ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export const Card = ({ children, className, hoverEffect = false }: CardProps) => {
    return (
        <motion.div
            whileHover={hoverEffect ? { y: -2 } : {}}
            className={clsx(
                "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-6 ",
                "transition-colors duration-200",
                className
            )}
        >
            {children}
        </motion.div>
    );
};
