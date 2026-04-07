"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useCurrentUserProfile from "src/app/components/profile/useCurrentUserProfile";
import { createClient } from "src/utils/supabase/client";

export default function EntrepreneurProfile() {
	const { username, role } = useCurrentUserProfile();
	const [profileUsername, setProfileUsername] = useState(username);
	const [aboutMe, setAboutMe] = useState("Over mij...");
	const [profilePic, setProfilePic] = useState("");
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isUploadOpen, setIsUploadOpen] = useState(false);
	const [editUsername, setEditUsername] = useState(username);
	const [editAboutMe, setEditAboutMe] = useState("Over mij...");
	const [editProfilePic, setEditProfilePic] = useState("");
	const [uploadFile, setUploadFile] = useState<File | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (username) {
			setProfileUsername(username);
			setEditUsername(username);
		}
	}, [username]);

	useEffect(() => {
		let isMounted = true;

		const loadProfile = async () => {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user?.email || !isMounted) return;

			const response = await fetch(
				`/api/profile?email=${encodeURIComponent(user.email)}&role=${encodeURIComponent(role ?? "ondernemer")}`,
				{ method: "GET", cache: "no-store" },
			);

			const responseText = await response.text();
			const result = (() => {
				try {
					return JSON.parse(responseText) as {
						error?: string;
						profile?: { username?: string; about_me?: string; profile_pic?: string };
					};
				} catch {
					return null;
				}
			})();

			if (!isMounted || !response.ok || !result?.profile) return;

			setProfileUsername(result.profile.username ?? username ?? "Gebruiker");
			setAboutMe(result.profile.about_me ?? "Over mij...");
			setProfilePic(result.profile.profile_pic ?? "");
		};

		void loadProfile();

		return () => {
			isMounted = false;
		};
	}, [role, username]);

	const openEdit = () => {
		setEditUsername(profileUsername);
		setEditAboutMe(aboutMe);
		setEditProfilePic(profilePic);
		setMessage(null);
		setError(null);
		setIsEditOpen(true);
	};

	const saveProfile = async () => {
		setIsSaving(true);
		setError(null);
		setMessage(null);

		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user?.email) {
			setError("Je bent niet ingelogd.");
			setIsSaving(false);
			return;
		}

		const response = await fetch("/api/profile", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: user.email,
				role: role ?? "ondernemer",
				username: editUsername,
				about_me: editAboutMe,
				profile_pic: editProfilePic,
			}),
		});

		const responseText = await response.text();
		const result = (() => {
			try {
				return JSON.parse(responseText) as { error?: string };
			} catch {
				return null;
			}
		})();

		if (!response.ok) {
			setError(result?.error ?? "Opslaan mislukt.");
			setIsSaving(false);
			return;
		}

		setProfileUsername(editUsername);
		setAboutMe(editAboutMe);
		setProfilePic(editProfilePic);
		setMessage("Profiel opgeslagen.");
		setIsSaving(false);
		setIsEditOpen(false);
	};

	const uploadPicture = async () => {
		if (!uploadFile) {
			setError("Selecteer een afbeelding.");
			return;
		}

		setIsUploading(true);
		setError(null);

		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user?.email) {
			setError("Je bent niet ingelogd.");
			setIsUploading(false);
			return;
		}

		const formData = new FormData();
		formData.append("file", uploadFile);
		formData.append("email", user.email);

		const response = await fetch("/api/profile/picture", {
			method: "POST",
			body: formData,
		});

		const responseText = await response.text();
		const result = (() => {
			try {
				return JSON.parse(responseText) as { error?: string; imageUrl?: string };
			} catch {
				return null;
			}
		})();

		if (!response.ok || !result?.imageUrl) {
			setError(result?.error ?? "Uploaden mislukt.");
			setIsUploading(false);
			return;
		}

		setEditProfilePic(result.imageUrl);
		setIsUploading(false);
		setIsUploadOpen(false);
		setUploadFile(null);
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 text-zinc-900">
			<div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
				{(error || message) && (
					<p className={`mb-4 rounded-lg px-3 py-2 text-sm ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
						{error ?? message}
					</p>
				)}
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<img src={profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUsername || username)}`} alt="Profielfoto" className="h-16 w-16 rounded-full object-cover ring-1 ring-zinc-200" />
						<h1 className="text-2xl font-bold">{profileUsername || username}</h1>
					</div>
					<div className="flex items-center gap-2">
						<Link href="/profile/pickups" className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-200">
							Pickup systeem
						</Link>
						<button type="button" onClick={openEdit} className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold hover:bg-zinc-200">
							Profiel bewerken
						</button>
					</div>
				</div>
				<p className="mt-4 text-zinc-600">{aboutMe || "Over mij..."}</p>
			</div>

			{isEditOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(event) => { if (event.target === event.currentTarget) setIsEditOpen(false); }}>
					<div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
						<h2 className="text-lg font-bold text-zinc-900">Profiel bewerken</h2>
						<div className="mt-4 flex items-center gap-3">
							<img src={editProfilePic || profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(editUsername || username)}`} alt="Profielfoto" className="h-14 w-14 rounded-full object-cover ring-1 ring-zinc-200" />
							<button type="button" onClick={() => setIsUploadOpen(true)} className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-200">
								Upload profielfoto
							</button>
						</div>
						<label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
							Gebruikersnaam
							<input type="text" value={editUsername} onChange={(event) => setEditUsername(event.target.value)} className="rounded-xl border border-zinc-200 px-4 py-2" />
						</label>
						<label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
							Bio
							<textarea value={editAboutMe} onChange={(event) => setEditAboutMe(event.target.value)} rows={4} className="rounded-xl border border-zinc-200 px-4 py-2" />
						</label>
						<div className="mt-5 flex justify-end gap-2">
							<button type="button" onClick={() => setIsEditOpen(false)} className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold hover:bg-zinc-200">Annuleren</button>
							<button type="button" onClick={() => void saveProfile()} disabled={isSaving} className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">{isSaving ? "Opslaan..." : "Opslaan"}</button>
						</div>
					</div>
				</div>
			)}

			{isUploadOpen && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={(event) => { if (event.target === event.currentTarget) setIsUploadOpen(false); }}>
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
						<h3 className="text-lg font-bold text-zinc-900">Profielfoto uploaden</h3>
						<input type="file" accept="image/*" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} className="mt-4 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
						<div className="mt-5 flex justify-end gap-2">
							<button type="button" onClick={() => setIsUploadOpen(false)} className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold hover:bg-zinc-200">Sluiten</button>
							<button type="button" onClick={() => void uploadPicture()} disabled={isUploading || !uploadFile} className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">{isUploading ? "Uploaden..." : "Upload"}</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
