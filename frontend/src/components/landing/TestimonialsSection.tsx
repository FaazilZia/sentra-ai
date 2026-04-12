'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { siteContent } from '../../lib/content';
import { Quote } from 'lucide-react';

/**
 * TestimonialsSection - User Social Proof
 * Grid of authentic endorsements with minimalist design.
 */
export const TestimonialsSection = () => {
  const { testimonials } = siteContent;

  return (
    <section className="py-24 bg-transparent border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-2xl border border-slate-800 bg-slate-800/20 flex flex-col justify-between"
            >
              <div>
                <Quote className="text-blue-500/40 mb-6" size={32} />
                <p className="text-slate-300 text-lg leading-relaxed italic mb-8">
                  "{testimonial.quote}"
                </p>
              </div>

              <div className="flex items-center gap-4 border-t border-slate-800 pt-6">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.author} 
                  className="w-10 h-10 rounded-full bg-slate-700 object-cover"
                />
                <div>
                  <div className="text-white font-bold text-sm tracking-tight">{testimonial.author}</div>
                  <div className="text-slate-500 text-xs font-semibold">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
