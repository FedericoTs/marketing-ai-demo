"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: '!bg-white !border-slate-200 !text-slate-900 shadow-lg',
          description: '!text-slate-600',
          actionButton: '!bg-blue-600 !text-white',
          cancelButton: '!bg-slate-200 !text-slate-900',
          error: '!bg-white !border-red-300 !text-red-900',
          success: '!bg-white !border-green-300 !text-green-900',
          warning: '!bg-white !border-amber-300 !text-amber-900',
          info: '!bg-white !border-blue-300 !text-blue-900',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
