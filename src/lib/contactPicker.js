import { Capacitor } from "@capacitor/core";

export function canPickPhoneContact() {
  if (Capacitor.isNativePlatform()) return true;
  return typeof navigator !== "undefined" && Boolean(navigator.contacts?.select);
}

function cleanPhone(value) {
  return String(value || "").trim();
}

function webContactToClient(contact) {
  const nameValue = Array.isArray(contact?.name) ? contact.name[0] : contact?.name;
  const telValue = Array.isArray(contact?.tel) ? contact.tel[0] : contact?.tel;
  return {
    name: String(nameValue || "").trim(),
    phone: cleanPhone(telValue),
  };
}

function nativeContactToClient(contact) {
  const name = String(
    contact?.displayName ||
    [contact?.givenName, contact?.middleName, contact?.familyName].filter(Boolean).join(" ")
  ).trim();
  const phone = cleanPhone(contact?.phoneNumbers?.[0]?.value);
  return { name, phone };
}

export async function pickPhoneContact() {
  if (Capacitor.isNativePlatform()) {
    const { CapacitorContacts, ContactProperty } = await import("@capgo/capacitor-contacts");
    const { contacts = [] } = await CapacitorContacts.pickContacts({
      property: ContactProperty.PhoneNumber,
    });
    const contact = contacts[0];
    if (!contact) return null;
    return nativeContactToClient(contact);
  }

  if (typeof navigator !== "undefined" && navigator.contacts?.select) {
    const contacts = await navigator.contacts.select(["name", "tel"], { multiple: false });
    const contact = contacts?.[0];
    if (!contact) return null;
    return webContactToClient(contact);
  }

  throw new Error("CONTACT_PICKER_UNAVAILABLE");
}

export function isContactPickerCancel(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return (
    message.includes("cancel") ||
    message.includes("отмен") ||
    code.includes("cancel") ||
    code === "os-plug-cont-0006"
  );
}
