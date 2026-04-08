"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatCategoryKey = "admins" | "entrepreneurs" | "artists" | "accompanists";

type ChatContact = {
    id: number;
    email: string;
    username: string;
    role: string;
    lastMessage: string | null;
    lastMessageImageUrl?: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
};

type ChatMessage = {
    id: number;
    senderId: number;
    receiverId: number;
    message: string;
    imageUrl?: string | null;
    sentDate: string | null;
    readDate: string | null;
};

type ChatContactsResponse = {
    currentUser?: {
        id: number;
        email: string;
        username: string;
        role: string;
    };
    contacts?: ChatContact[];
    categories?: Record<ChatCategoryKey, ChatContact[]>;
    unreadTotal?: number;
    error?: string;
};

type ChatRequest = {
    id: number;
    username: string;
    role: string;
    profilePic: string | null;
};

const areMessagesEqual = (current: ChatMessage[], next: ChatMessage[]) => {
    if (current.length !== next.length) return false;

    return current.every((item, index) => {
        const nextItem = next[index];
        return (
            item.id === nextItem?.id &&
            item.message === nextItem?.message &&
            item.imageUrl === nextItem?.imageUrl &&
            item.sentDate === nextItem?.sentDate &&
            item.readDate === nextItem?.readDate
        );
    });
};

const categoryLabels: Record<ChatCategoryKey, string> = {
    admins: "Admins",
    entrepreneurs: "Ondernemers",
    artists: "Artiesten",
    accompanists: "Begeleiders",
};

const formatDateTime = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("nl-NL", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const roleLabel = (role: string) => {
    if (role === "admin") return "Admin";
    if (role === "ondernemer") return "Ondernemer";
    if (role === "kunstenaar") return "Artiest";
    if (role === "begeleider") return "Begeleider";
    return role;
};

export default function ChatPage() {
    const [currentUser, setCurrentUser] = useState<ChatContactsResponse["currentUser"]>(null);
    const [contacts, setContacts] = useState<ChatContact[]>([]);
    const [categories, setCategories] = useState<Record<ChatCategoryKey, ChatContact[]>>({
        admins: [],
        entrepreneurs: [],
        artists: [],
        accompanists: [],
    });
    const [activeCategory, setActiveCategory] = useState<ChatCategoryKey>("admins");
    const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
    const [isLoadingContacts, setIsLoadingContacts] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [messageError, setMessageError] = useState<string | null>(null);
    const [messageInfo, setMessageInfo] = useState<string | null>(null);
    const [pendingRequests, setPendingRequests] = useState<{ outgoing: ChatRequest[]; incoming: ChatRequest[] }>({ outgoing: [], incoming: [] });
    const [followingBack, setFollowingBack] = useState<number | null>(null);
    const [chatEnabled, setChatEnabled] = useState(true);
    const messageEndRef = useRef<HTMLDivElement | null>(null);
    const hasLoadedConversationRef = useRef(false);

    const clearSelectedFile = () => {
        if (selectedFilePreview) {
            URL.revokeObjectURL(selectedFilePreview);
        }
        setSelectedFile(null);
        setSelectedFilePreview(null);
    };

    const fetchContacts = async () => {
        const response = await fetch("/api/chat/contacts", { method: "GET", cache: "no-store" });
        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as ChatContactsResponse;
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            throw new Error(result?.error ?? "Kon chatcontacten niet laden.");
        }

        const nextContacts: ChatContact[] = result?.contacts ?? [];
        const nextCategories: Record<ChatCategoryKey, ChatContact[]> = result?.categories ?? {
            admins: [],
            entrepreneurs: [],
            artists: [],
            accompanists: [],
        };

        setCurrentUser(result?.currentUser ?? null);
        setContacts(nextContacts);
        setCategories(nextCategories);

        const currentCategoryContacts = nextCategories[activeCategory as ChatCategoryKey] ?? [];
        if (currentCategoryContacts.length === 0) {
            const firstNonEmptyCategory = (Object.keys(nextCategories) as ChatCategoryKey[]).find(
                (key) => (nextCategories[key] ?? []).length > 0,
            );
            if (firstNonEmptyCategory) {
                setActiveCategory(firstNonEmptyCategory);
                const firstContact = nextCategories[firstNonEmptyCategory]?.[0] ?? null;
                setSelectedContactId(firstContact?.id ?? null);
            } else {
                setSelectedContactId(null);
            }
            return;
        }

        if (!selectedContactId || !nextContacts.some((contact: ChatContact) => contact.id === selectedContactId)) {
            setSelectedContactId(currentCategoryContacts[0]?.id ?? null);
        }
    };

    const fetchRequests = async () => {
        const response = await fetch("/api/chat/requests", { method: "GET", cache: "no-store" });
        if (!response.ok) return;
        const result = (await response.json()) as { outgoing?: ChatRequest[]; incoming?: ChatRequest[] };
        setPendingRequests({
            outgoing: result?.outgoing ?? [],
            incoming: result?.incoming ?? [],
        });
    };

    const fetchStatus = async () => {
        const response = await fetch("/api/chat/status", { method: "GET", cache: "no-store" });
        if (!response.ok) return;
        const result = (await response.json()) as { chatEnabled?: boolean };
        setChatEnabled(result?.chatEnabled ?? true);
    };

    const fetchMessages = async (contactId: number, options?: { showLoader?: boolean }) => {
        const showLoader = options?.showLoader ?? false;
        if (showLoader) {
            setIsLoadingMessages(true);
            setMessageError(null);
        }

        const response = await fetch(`/api/chat/messages?contactId=${contactId}`, {
            method: "GET",
            cache: "no-store",
        });
        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as { error?: string; messages?: ChatMessage[] };
            } catch {
                return null;
            }
        })();

        if (!response.ok) {
            setMessageError(result?.error ?? "Kon berichten niet laden.");
            if (showLoader) {
                setIsLoadingMessages(false);
            }
            return;
        }

        const nextMessages = result?.messages ?? [];
        setMessages((current: ChatMessage[]) => (areMessagesEqual(current, nextMessages) ? current : nextMessages));
        if (showLoader) {
            setIsLoadingMessages(false);
        }
    };

    useEffect(() => {
        return () => {
            if (selectedFilePreview) {
                URL.revokeObjectURL(selectedFilePreview);
            }
        };
    }, [selectedFilePreview]);

    useEffect(() => {
        void (async () => {
            setIsLoadingContacts(true);
            setError(null);
            try {
                await Promise.all([fetchContacts(), fetchRequests(), fetchStatus()]);
            } catch (fetchError) {
                setError(fetchError instanceof Error ? fetchError.message : "Kon chat niet laden.");
            } finally {
                setIsLoadingContacts(false);
            }
        })();
    }, []);

    useEffect(() => {
        const categoryContacts = categories[activeCategory] ?? [];
        if (
            categoryContacts.length > 0 &&
            !categoryContacts.some((contact: ChatContact) => contact.id === selectedContactId)
        ) {
            setSelectedContactId(categoryContacts[0]?.id ?? null);
        }
        if (categoryContacts.length === 0) {
            setSelectedContactId(null);
        }
    }, [activeCategory, categories, selectedContactId]);

    useEffect(() => {
        if (!selectedContactId) {
            setMessages([]);
            hasLoadedConversationRef.current = false;
            return;
        }

        hasLoadedConversationRef.current = false;
        void fetchMessages(selectedContactId, { showLoader: true }).finally(() => {
            hasLoadedConversationRef.current = true;
        });
        const interval = window.setInterval(() => {
            void fetchMessages(selectedContactId, { showLoader: false });
            void fetchContacts().catch(() => undefined);
            void fetchRequests().catch(() => undefined);
        }, 8000);

        return () => window.clearInterval(interval);
    }, [selectedContactId]);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const filteredContacts = useMemo(
        () => categories[activeCategory as ChatCategoryKey] ?? [],
        [activeCategory, categories],
    );
    const selectedContact = useMemo(
        () => contacts.find((contact: ChatContact) => contact.id === selectedContactId) ?? null,
        [contacts, selectedContactId],
    );

    const handleSend = async () => {
        if (!selectedContact || (!draft.trim() && !selectedFile)) return;

        setIsSending(true);
        setMessageError(null);
        setMessageInfo(null);

        const formData = new FormData();
        formData.append("contactId", String(selectedContact.id));
        formData.append("message", draft);
        if (selectedFile) {
            formData.append("file", selectedFile);
        }

        const response = await fetch("/api/chat/messages", {
            method: "POST",
            body: formData,
        });
        const responseText = await response.text();
        const result = (() => {
            try {
                return JSON.parse(responseText) as { error?: string; message?: ChatMessage };
            } catch {
                return null;
            }
        })();

        if (!response.ok || !result?.message) {
            setMessageError(result?.error ?? "Bericht versturen mislukt.");
            setIsSending(false);
            return;
        }

        setMessages((current: ChatMessage[]) => [...current, result.message as ChatMessage]);
        setDraft("");
        clearSelectedFile();
        setMessageInfo("Bericht verzonden.");
        setIsSending(false);
        await fetchContacts();
    };

    const handleFollowBack = async (targetUserId: number) => {
        setFollowingBack(targetUserId);
        try {
            const response = await fetch("/api/follows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetUserId }),
            });
            if (response.ok) {
                await Promise.all([fetchRequests(), fetchContacts()]);
            }
        } finally {
            setFollowingBack(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#f5f5f5] px-4 py-8">
            <div className="mx-auto w-full max-w-7xl">
                <div className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/kunstkwartiertje-logo.png"
                            alt="Kunstkwartiertje"
                            width={180}
                            height={60}
                            className="object-contain"
                        />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Chat hub</h1>
                            <p className="text-sm text-gray-500">Berichten blijven bewaard, inclusief verzend- en leesmomenten.</p>
                        </div>
                    </div>
                    <Link
                        href="/art_gallery"
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                    >
                        Terug naar overzicht
                    </Link>
                </div>

                {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Categorieën</h2>

                            {(pendingRequests.incoming.length > 0 || pendingRequests.outgoing.length > 0) && (
                                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-amber-800">Chatverzoeken</span>
                                        <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                                            {pendingRequests.incoming.length + pendingRequests.outgoing.length}
                                        </span>
                                    </div>

                                    {pendingRequests.incoming.length > 0 && (
                                        <div>
                                            <p className="mb-1.5 text-xs font-medium text-amber-700">Ontvangen — volg terug om te chatten</p>
                                            <div className="space-y-1.5">
                                                {pendingRequests.incoming.map((req) => (
                                                    <div key={req.id} className="flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white px-2.5 py-2">
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <img
                                                                src={req.profilePic ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(req.username)}&size=24&background=f5f5f5&color=111`}
                                                                alt={req.username}
                                                                className="h-6 w-6 shrink-0 rounded-full object-cover"
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="truncate text-xs font-semibold text-gray-800">{req.username}</p>
                                                                <p className="text-[10px] text-gray-400">{roleLabel(req.role)}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleFollowBack(req.id)}
                                                            disabled={followingBack === req.id}
                                                            className="shrink-0 rounded-full bg-black px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
                                                        >
                                                            {followingBack === req.id ? "Bezig..." : "Volg terug"}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {pendingRequests.outgoing.length > 0 && (
                                        <div>
                                            <p className="mb-1.5 text-xs font-medium text-amber-700">Verzonden — wacht op reactie</p>
                                            <div className="space-y-1.5">
                                                {pendingRequests.outgoing.map((req) => (
                                                    <div key={req.id} className="flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white px-2.5 py-2">
                                                        <div className="flex min-w-0 items-center gap-2">
                                                            <img
                                                                src={req.profilePic ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(req.username)}&size=24&background=f5f5f5&color=111`}
                                                                alt={req.username}
                                                                className="h-6 w-6 shrink-0 rounded-full object-cover"
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="truncate text-xs font-semibold text-gray-800">{req.username}</p>
                                                                <p className="text-[10px] text-gray-400">{roleLabel(req.role)}</p>
                                                            </div>
                                                        </div>
                                                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 ring-1 ring-gray-200">
                                                            Wacht op reactie
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-4 grid grid-cols-2 gap-2">
                                {(Object.keys(categoryLabels) as ChatCategoryKey[]).map((category: ChatCategoryKey) => (
                                    <button
                                        key={category}
                                        type="button"
                                        onClick={() => setActiveCategory(category)}
                                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                                            activeCategory === category
                                                ? "border-black bg-black text-white"
                                                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                        }`}
                                    >
                                        <span>{categoryLabels[category]}</span>
                                        <span className="ml-2 text-xs opacity-80">{categories[category as ChatCategoryKey]?.length ?? 0}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-5 space-y-2">
                                {isLoadingContacts ? (
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">Contacten laden...</div>
                                ) : filteredContacts.length === 0 ? (
                                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                                        Geen contacten in deze categorie.
                                    </div>
                                ) : (
                                    filteredContacts.map((contact: ChatContact) => (
                                        <button
                                            key={contact.id}
                                            type="button"
                                            onClick={() => setSelectedContactId(contact.id)}
                                            className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                                                selectedContactId === contact.id
                                                    ? "border-black bg-black text-white"
                                                    : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold">{contact.username}</p>
                                                    <p className={`text-xs ${selectedContactId === contact.id ? "text-gray-300" : "text-gray-500"}`}>
                                                        {contact.role === "admin"
                                                            ? `${roleLabel(contact.role)} · ${contact.email}`
                                                            : roleLabel(contact.role)}
                                                    </p>
                                                </div>
                                                {contact.unreadCount > 0 && (
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                        selectedContactId === contact.id ? "bg-white text-black" : "bg-black text-white"
                                                    }`}>
                                                        {contact.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`mt-2 line-clamp-2 text-xs ${selectedContactId === contact.id ? "text-gray-200" : "text-gray-500"}`}>
                                                {contact.lastMessage || "Nog geen berichten"}
                                            </p>
                                            {contact.lastMessageAt && (
                                                <p className={`mt-2 text-[11px] ${selectedContactId === contact.id ? "text-gray-300" : "text-gray-400"}`}>
                                                    {formatDateTime(contact.lastMessageAt)}
                                                </p>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                            <div className="border-b border-gray-200 px-5 py-4">
                                {selectedContact ? (
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">{selectedContact.username}</h2>
                                            <p className="text-sm text-gray-500">{roleLabel(selectedContact.role)} · {selectedContact.email}</p>
                                        </div>
                                        {currentUser && (
                                            <div className="text-right text-xs text-gray-500">
                                                <p>Ingelogd als</p>
                                                <p className="font-medium text-gray-700">{currentUser.username}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <h2 className="text-xl font-semibold text-gray-900">Kies een contact om te chatten</h2>
                                )}
                            </div>

                            <div className="flex min-h-[560px] flex-col">
                                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                                    {messageError && (
                                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{messageError}</div>
                                    )}
                                    {messageInfo && !messageError && (
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{messageInfo}</div>
                                    )}
                                    {!selectedContact ? (
                                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                                            Selecteer een gebruiker uit een categorie om een gesprek te openen.
                                        </div>
                                    ) : isLoadingMessages && !hasLoadedConversationRef.current ? (
                                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                                            Berichten laden...
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                                            Nog geen berichten. Start het gesprek hieronder.
                                        </div>
                                    ) : (
                                        messages.map((item) => {
                                            const isOwn = item.senderId === currentUser?.id;
                                            return (
                                                <div key={item.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                                                    <div
                                                        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                                                            isOwn ? "bg-black text-white" : "bg-gray-100 text-gray-900"
                                                        }`}
                                                    >
                                                        {item.imageUrl && (
                                                            <img
                                                                src={item.imageUrl}
                                                                alt="Verstuurde foto"
                                                                className="mb-2 max-h-64 w-full rounded-xl object-cover"
                                                            />
                                                        )}
                                                        {item.message && <p className="whitespace-pre-wrap text-sm">{item.message}</p>}
                                                        <div className={`mt-2 text-[11px] ${isOwn ? "text-gray-300" : "text-gray-500"}`}>
                                                            <p>Verzonden: {formatDateTime(item.sentDate) || "Onbekend"}</p>
                                                            <p>{item.readDate ? `Gelezen: ${formatDateTime(item.readDate)}` : "Nog niet gelezen"}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messageEndRef} />
                                </div>

                                <div className="border-t border-gray-200 px-5 py-4">
                                    {!chatEnabled && (
                                        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                            <span className="font-semibold">Alleen lezen</span> &mdash; Je begeleider heeft chat uitgeschakeld. Je kunt berichten lezen maar niet versturen.
                                        </div>
                                    )}
                                    {selectedFilePreview && (
                                        <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={selectedFilePreview}
                                                    alt="Voorvertoning"
                                                    className="h-16 w-16 rounded-lg object-cover"
                                                />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">Foto klaar om te versturen</p>
                                                    <p className="text-xs text-gray-500">{selectedFile?.name ?? "Afbeelding"}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={clearSelectedFile}
                                                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                                            >
                                                Verwijderen
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-end gap-3">
                                        <label className={`flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 ${chatEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="sr-only"
                                                disabled={!chatEnabled}
                                                onChange={(event) => {
                                                    const file = event.target.files?.[0] ?? null;
                                                    if (!file) return;
                                                    if (selectedFilePreview) {
                                                        URL.revokeObjectURL(selectedFilePreview);
                                                    }
                                                    setSelectedFile(file);
                                                    setSelectedFilePreview(URL.createObjectURL(file));
                                                }}
                                            />
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.8"
                                                className="h-5 w-5"
                                                aria-hidden="true"
                                            >
                                                <rect x="3" y="5" width="18" height="14" rx="2" />
                                                <circle cx="8.5" cy="10" r="1.5" />
                                                <path d="m21 15-4.5-4.5L8 19" />
                                            </svg>
                                        </label>
                                        <textarea
                                            value={draft}
                                            onChange={(event) => setDraft(event.target.value)}
                                            rows={3}
                                            placeholder={!chatEnabled ? "Chat uitgeschakeld door begeleider" : selectedContact ? "Typ je bericht..." : "Kies eerst een contact"}
                                            disabled={!selectedContact || isSending || !chatEnabled}
                                            className="min-h-[88px] flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => void handleSend()}
                                            disabled={!selectedContact || (!draft.trim() && !selectedFile) || isSending || !chatEnabled}
                                            className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
                                        >
                                            {isSending ? "Versturen..." : "Verstuur"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
