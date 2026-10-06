import { z } from 'zod'

export const reminderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  type: z.enum(['HOMEWORK', 'PROJECT', 'TEST']),
  subject: z.string().max(100).nullish(),
  dueAt: z.string().datetime().nullish(),
  notes: z.string().max(5000).nullish(),
  completed: z.boolean().optional().default(false),
})

export type ReminderInput = z.infer<typeof reminderSchema>

export const taskSchema = z.object({
  text: z.string().min(1, 'Task text is required').max(500),
  done: z.boolean().optional().default(false),
  order: z.number().int().optional(),
})

export type TaskInput = z.infer<typeof taskSchema>

export const materialUploadSchema = z.object({
  reminderId: z.string().uuid(),
  file: z
    .instanceof(File)
    .refine(
      (f) => f.size <= (parseInt(process.env.MAX_UPLOAD_SIZE_MB || '500', 10) * 1024 * 1024),
      `File must be under ${process.env.MAX_UPLOAD_SIZE_MB || '500'}MB`
    )
    .refine(
      (f) =>
        ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown', 'text/x-markdown'].includes(f.type) ||
        f.name.endsWith('.txt') ||
        f.name.endsWith('.md'),
      'Unsupported file type. Use PDF, DOCX, TXT, or MD.'
    ),
})

export type MaterialUploadInput = z.infer<typeof materialUploadSchema>

export const quizGenerationSchema = z.object({
  reminderId: z.string().uuid(),
  questionCount: z.number().int().min(1).max(50),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  materialIds: z.array(z.string().uuid()).min(1, 'Select at least one material'),
})

export type QuizGenerationInput = z.infer<typeof quizGenerationSchema>

export const attemptSubmitSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.record(z.number()), // questionIndex -> selectedOptionIndex
})

export type AttemptSubmitInput = z.infer<typeof attemptSubmitSchema>

export const chatMessageSchema = z.object({
  reminderId: z.string().uuid().optional().or(z.literal('')),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message cannot be empty').max(10000),
})

export type ChatMessageInput = z.infer<typeof chatMessageSchema>

export const quizQuestionSchema = z.object({
  prompt: z.string().min(1),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
})

export type QuizQuestion = z.infer<typeof quizQuestionSchema>

export const quizOutputSchema = z.object({
  questions: z.array(quizQuestionSchema),
  message: z.string().optional(),
})

export type QuizOutput = z.infer<typeof quizOutputSchema>
