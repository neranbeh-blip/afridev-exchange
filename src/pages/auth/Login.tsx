import { Code2, Lock, Mail, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-slate-50">

      <div className="hidden flex-1 bg-blue-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700">
            <Code2 size={21} />
          </div>

          <div>
            <p className="font-bold">AfriDev</p>
            <p className="text-xs text-blue-200">Exchange</p>
          </div>
        </div>

        <div className="max-w-lg">

          <h1 className="text-5xl font-bold leading-tight">
            Exchange skills.
            <br />
            Build together.
          </h1>

          <p className="mt-6 text-lg leading-8 text-blue-100">
            Connect with African developers through complementary
            skills and real technical collaboration.
          </p>

        </div>

        <p className="text-sm text-blue-200">
          Built by TechVision · Cameroon 🇨🇲
        </p>

      </div>


      <div className="flex flex-1 items-center justify-center p-6">

        <div className="w-full max-w-md">

          <div className="mb-8 lg:hidden">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white">
                <Code2 size={21} />
              </div>

              <p className="font-bold">
                AfriDev Exchange
              </p>

            </div>

          </div>


          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

            <h2 className="text-2xl font-bold">
              Welcome back
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Sign in to continue building with African developers.
            </p>


            <form
              className="mt-8 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                navigate("/dashboard");
              }}
            >

              <div>

                <label className="mb-2 block text-sm font-semibold">
                  Email
                </label>

                <div className="relative">

                  <Mail
                    size={18}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />

                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    required
                  />

                </div>

              </div>


              <div>

                <label className="mb-2 block text-sm font-semibold">
                  Password
                </label>

                <div className="relative">

                  <Lock
                    size={18}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />

                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    required
                  />

                </div>

              </div>


              <div className="flex justify-end">

                <button
                  type="button"
                  className="text-sm font-semibold text-blue-700"
                >
                  Forgot password?
                </button>

              </div>


              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-3.5 font-semibold text-white hover:bg-blue-800"
              >
                Sign in
                <ArrowRight size={18} />
              </button>

            </form>


            <p className="mt-6 text-center text-sm text-slate-500">

              Don't have an account?{" "}

              <Link
                to="/register"
                className="font-semibold text-blue-700"
              >
                Create one
              </Link>

            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;