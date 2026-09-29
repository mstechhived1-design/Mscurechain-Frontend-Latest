'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { contentService } from '@/lib/integrations/services/content.service';
import { Testimonial } from '@/lib/integrations/types/cms';

const LandingTestimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const fetchTestimonials = useCallback(async () => {
    try {
      const data = await contentService.getPublicTestimonials();
      setTestimonials(data);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  const paginate = useCallback((newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      let nextIndex = prevIndex + newDirection;
      if (nextIndex < 0) nextIndex = testimonials.length - 1;
      if (nextIndex >= testimonials.length) nextIndex = 0;
      return nextIndex;
    });
  }, [testimonials.length]);

  // Auto-scroll logic
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => {
      paginate(1);
    }, 4000);
    return () => clearInterval(timer);
  }, [testimonials.length, paginate]);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 500 : -500,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 500 : -500,
      opacity: 0,
      scale: 0.9
    })
  };

  if (!loading && testimonials.length === 0) return null;

  return (
    <section className="py-24 bg-white overflow-hidden relative border-t border-slate-50 selection:bg-primary-theme/10 selection:text-primary-theme">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-theme/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10 text-left">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-2 text-primary-theme font-black text-[8px] uppercase tracking-[0.3em] mb-4"
            >
              <div className="w-6 h-px bg-primary-theme/30" />
              Verified Clinical Success
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-2xl md:text-3xl font-black text-slate-900 leading-tight uppercase"
            >
              The Voice of <span className="text-primary-theme">Innovation</span>
            </motion.h2>
            <p className="text-slate-500 mt-3 text-[10px] font-medium leading-relaxed max-w-lg">
                Explore feedback from top hospitals and doctors using MSCureChain.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => paginate(-1)}
              className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-theme hover:border-primary-theme/50 transition-all shadow-sm active:scale-95"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => paginate(1)}
              className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-theme hover:border-primary-theme/50 transition-all shadow-sm active:scale-95"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Carousel Area */}
        <div className="relative h-[420px] w-full items-center justify-center hidden md:flex">
          {loading ? (
             <div className="w-full max-w-2xl h-80 bg-slate-50 animate-pulse rounded-[3rem]" />
          ) : (
            <AnimatePresence initial={false} custom={direction}>
              {testimonials.map((item, index) => (
                index === currentIndex && (
                  <motion.div
                    key={item._id}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 },
                      scale: { duration: 0.4 }
                    }}
                    className="absolute w-full max-w-2xl bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col group overflow-hidden"
                  >
                     <div className="absolute top-8 right-8 text-slate-50">
                        <Quote size={120} strokeWidth={4} />
                     </div>
                     
                     <div className="relative z-10">
                        <div className="flex items-center gap-1 text-yellow-500 mb-10">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} className={i < item.rating ? 'fill-yellow-500' : 'text-slate-100'} />
                          ))}
                        </div>

                        <blockquote className="text-slate-700 font-medium  mb-12 leading-relaxed text-lg">
                          "{item.content}"
                        </blockquote>

                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 rounded-2xl bg-slate-50 p-1 ring-4 ring-slate-100/50 shrink-0">
                            <img 
                              src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`} 
                              className="w-full h-full object-cover rounded-xl shadow-inner" 
                              alt={item.name}
                            />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 uppercase  tracking-tight text-base group-hover:text-primary-theme transition-colors leading-none mb-1.5">
                              {item.name}
                            </h4>
                            <p className="text-[9px] text-primary-theme font-black uppercase tracking-[0.2em] opacity-70">
                               {item.designation} {item.company && `• ${item.company}`}
                            </p>
                          </div>
                        </div>

                        <div className="mt-10 pt-6 border-t border-slate-50 flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-200" />
                              <span className="text-[8px] font-black uppercase tracking-widest text-green-500">
                                Authenticated Staff Record
                              </span>
                           </div>
                           <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">
                             Validation ID: {item._id.slice(-8).toUpperCase()}
                           </p>
                        </div>
                     </div>
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Mobile View (Simple Scroll) */}
        <div className="md:hidden flex overflow-x-auto no-scrollbar gap-6 pb-8 snap-x snap-mandatory">
          {testimonials.map((item) => (
             <div key={item._id} className="min-w-full snap-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                <blockquote className="text-slate-600 font-medium text-sm mb-6">"{item.content}"</blockquote>
                <div className="flex items-center gap-3">
                   <img src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`} className="w-10 h-10 rounded-lg" alt="" />
                   <h4 className="font-black text-slate-900 text-sm">{item.name}</h4>
                </div>
             </div>
          ))}
        </div>

        {/* Navigation Indicator dots */}
        <div className="flex justify-center mt-8 gap-1.5 pb-2">
            {testimonials.map((_, i) => (
                <button
                    key={i}
                    type="button"
                    suppressHydrationWarning
                    onClick={() => {
                        setDirection(i > currentIndex ? 1 : -1);
                        setCurrentIndex(i);
                    }}
                    className={`h-1 rounded-full transition-all duration-300 ${
                        i === currentIndex ? 'w-8 bg-primary-theme' : 'w-2 bg-slate-200 hover:bg-slate-300'
                    }`}
                />
            ))}
        </div>
      </div>
    </section>
  );
};

export default LandingTestimonials;
