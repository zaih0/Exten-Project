"use client";

import useCurrentUserProfile from "src/app/components/profile/useCurrentUserProfile";

export default function EntrepreneurProfile() {
	const { username } = useCurrentUserProfile();

	return (
		<div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 text-zinc-900">
			<div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
				<h1 className="text-2xl font-bold">{username}</h1>
				<p className="mt-3 text-zinc-600">
					Deze pagina is actief en compileert correct.
				</p>
			</div>
		</div>
	);
}
