// frontend/src/components/ManualTooltip.tsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ManualTooltipProps {
  title: string;
  stats: string[];
  description?: string;
  type?: 'gem' | 'enchant';
  children: React.ReactNode;
  className?: string;
}

export function ManualTooltip({ 
  title, 
  stats, 
  description,
  type = 'gem',
  children,
  className = ''
}: ManualTooltipProps) {
  const [show, setShow] = useState(false);

  const getBorderColor = () => {
    return type === 'gem' 
      ? 'border-purple-500/70 shadow-purple-500/20' 
      : 'border-green-500/70 shadow-green-500/20';
  };

  const getTitleColor = () => {
    return type === 'gem'
      ? 'text-purple-300'
      : 'text-green-300';
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[100] pointer-events-none"
            style={{ zIndex: 9999 }}
          >
            <div className={`
              bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900
              border-2 ${getBorderColor()} 
              rounded-lg p-2.5 shadow-2xl 
              min-w-[180px] max-w-[280px]
              backdrop-blur-md
            `}>
              {/* Título */}
              <div className={`${getTitleColor()} font-bold mb-1.5 text-xs leading-tight`}>
                {title}
              </div>
              
              {/* Stats */}
              {stats.length > 0 && (
                <div className="space-y-0.5 mb-1.5">
                  {stats.map((stat, idx) => (
                    <div key={idx} className="text-green-300 text-[11px] font-medium leading-tight">
                      {stat}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Description */}
              {description && (
                <div className="text-gray-400 text-[10px] italic border-t border-dark-600/50 pt-1.5 leading-tight">
                  {description}
                </div>
              )}

              {/* Flecha del tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px]">
                <div className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] ${
                  type === 'gem' ? 'border-t-purple-500/70' : 'border-t-green-500/70'
                }`} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}