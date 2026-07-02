"use server";

import { resend } from "@/app/lib/resend";

export type ContactFormState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function sendContactMessage(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const msg = String(formData.get("msg") ?? "").trim();

  if (!name || !email || !msg) {
    return { status: "error", message: "Completá todos los campos." };
  }

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_FROM_EMAIL as string,
    to: process.env.CONTACT_TO_EMAIL as string,
    replyTo: email,
    subject: `Nuevo mensaje de contacto — ${name}`,
    text: `De: ${name} <${email}>\n\n${msg}`,
  });

  if (error) {
    return { status: "error", message: "No se pudo enviar el mensaje. Intentá de nuevo." };
  }

  return { status: "idle" };
}
