// login screen
export default function login() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-3xl font-bold">Login</h1>
      <form className="flex flex-col gap-4">
        <input type="text" placeholder="Username" className="border border-gray-300 rounded px-4 py-2" />
        <input type="password" placeholder="Password" className="border border-gray-300 rounded px-4 py-2" />
        <button type="submit" className="bg-blue-500 text-white rounded px-4 py-2">Login</button>
      </form>
    </div>
  );
}