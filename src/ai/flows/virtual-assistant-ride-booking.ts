// Virtual assistant flow to book rides using natural language.

'use server';

/**
 * @fileOverview A virtual assistant for ride booking that uses natural language understanding.
 *
 * - virtualAssistantRideBooking - A function that handles the ride booking process via a virtual assistant.
 * - VirtualAssistantRideBookingInput - The input type for the virtualAssistantRideBooking function.
 * - VirtualAssistantRideBookingOutput - The return type for the virtualAssistantRideBooking function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VirtualAssistantRideBookingInputSchema = z.object({
  query: z.string().describe('The user query related to ride booking.'),
  currentBookingDetails: z.optional(z.record(z.any())).describe('The current booking details, if any.'),
});

export type VirtualAssistantRideBookingInput = z.infer<typeof VirtualAssistantRideBookingInputSchema>;

const VirtualAssistantRideBookingOutputSchema = z.object({
  rideDetails: z.record(z.any()).describe('The extracted and/or updated ride details.'),
  response: z.string().describe('The response from the virtual assistant.'),
  isBookingComplete: z.boolean().describe('Whether the booking is complete.'),
});

export type VirtualAssistantRideBookingOutput = z.infer<typeof VirtualAssistantRideBookingOutputSchema>;

export async function virtualAssistantRideBooking(input: VirtualAssistantRideBookingInput): Promise<VirtualAssistantRideBookingOutput> {
  return virtualAssistantRideBookingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'virtualAssistantRideBookingPrompt',
  input: {schema: VirtualAssistantRideBookingInputSchema},
  output: {schema: VirtualAssistantRideBookingOutputSchema},
  prompt: `You are a virtual assistant designed to help users book rides.

  Your primary goal is to extract relevant information from the user's queries and pre-fill the booking form fields.  If information is missing, ask clarifying questions.
  Once all required information is gathered, confirm the booking with the user.

  Current booking details: {{{currentBookingDetails}}}
  User query: {{{query}}}

  Respond in a conversational tone and ensure the user feels supported throughout the booking process.

  Output in JSON format, the rideDetails (a record of ride details), a response to the user, and whether the booking is complete (isBookingComplete).
  `,
});

const virtualAssistantRideBookingFlow = ai.defineFlow(
  {
    name: 'virtualAssistantRideBookingFlow',
    inputSchema: VirtualAssistantRideBookingInputSchema,
    outputSchema: VirtualAssistantRideBookingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
