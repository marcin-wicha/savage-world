import { z } from 'zod'

export const partyFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Party name is required.')
    .max(100, 'Party name must be 100 characters or fewer.'),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer.'),
})

export type PartyFormValues = z.infer<typeof partyFormSchema>
