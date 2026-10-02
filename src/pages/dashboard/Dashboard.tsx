import {
  ArrowRight,
  CheckCircle2,
  Handshake,
  Plus,
  Sparkles,
} from "lucide-react";

function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

      {/* Header */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

        <div>
          <p className="text-sm font-medium text-blue-700">
            Welcome back 👋
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Turn your skills into opportunities.
          </h1>

          <p className="mt-2 text-slate-500">
            Discover developers, exchange skills and build together.
          </p>
        </div>


        <div className="flex gap-3">

          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Plus size={17} />
            Add Need
          </button>

          <button className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800">
            <Plus size={17} />
            Add Offer
          </button>

        </div>

      </div>


      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {[
          ["8", "Exchanges completed"],
          ["3", "Projects"],
          ["12", "Verified contributions"],
          ["7", "Collaborations"],
        ].map(([value, label]) => (

          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >

            <p className="text-2xl font-bold text-slate-950">
              {value}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {label}
            </p>

          </div>

        ))}

      </div>


      {/* Matches */}
      <section className="mt-8">

        <div className="flex items-center justify-between">

          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-blue-700">
              <Sparkles size={16} />
              Your skill matches
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Developers who complement your skills
            </h2>
          </div>

          <button className="hidden items-center gap-2 text-sm font-semibold text-blue-700 sm:flex">
            View all
            <ArrowRight size={16} />
          </button>

        </div>


        <div className="mt-5 grid gap-5 lg:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white p-6">

            <div className="flex items-start justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                  DK
                </div>

                <div>

                  <p className="font-bold">
                    Developer B
                  </p>

                  <p className="text-sm text-slate-500">
                    Kenya 🇰🇪
                  </p>

                </div>

              </div>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                94% match
              </span>

            </div>


            <div className="mt-5 grid grid-cols-2 gap-3">

              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-600">
                  THEY OFFER
                </p>

                <p className="mt-2 font-bold">
                  Flutter
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-xs font-semibold text-green-600">
                  YOU OFFER
                </p>

                <p className="mt-2 font-bold">
                  PostgreSQL
                </p>
              </div>

            </div>


            <div className="mt-4 space-y-2 text-sm text-slate-600">

              <p>✓ Your Flutter need matches their offer.</p>
              <p>✓ Their database need matches your offer.</p>

            </div>


            <button className="mt-5 w-full rounded-xl bg-blue-700 py-3 text-sm font-semibold text-white hover:bg-blue-800">
              View match
            </button>

          </div>


          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">

            <div className="flex h-full flex-col items-center justify-center text-center">

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-700 shadow-sm">
                <Handshake size={22} />
              </div>

              <h3 className="mt-4 font-bold">
                Find more collaborators
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Add more skills, offers and needs to discover
                developers who complement your capabilities.
              </p>

              <button className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                Complete your Passport
                <ArrowRight size={16} />
              </button>

            </div>

          </div>

        </div>

      </section>


      {/* Activity */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">

        <div className="rounded-2xl border border-slate-200 bg-white p-6">

          <h2 className="text-lg font-bold">
            Active exchanges
          </h2>

          <div className="mt-5">

            <div className="flex items-center justify-between">

              <div>
                <p className="font-semibold">
                  PostgreSQL ↔ Flutter
                </p>

                <p className="text-sm text-slate-500">
                  Developer B · Kenya
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                Active
              </span>

            </div>


            <div className="mt-5">

              <div className="mb-2 flex justify-between text-xs text-slate-500">
                <span>Progress</span>
                <span>80%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-4/5 rounded-full bg-blue-700" />
              </div>

            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-6">

          <h2 className="text-lg font-bold">
            Recent contributions
          </h2>

          <div className="mt-5 space-y-4">

            {[
              "Database schema",
              "API endpoints",
              "Supabase integration",
            ].map((item) => (

              <div
                key={item}
                className="flex items-center justify-between"
              >

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-600">
                    <CheckCircle2 size={18} />
                  </div>

                  <p className="text-sm font-medium">
                    {item}
                  </p>

                </div>

                <span className="text-xs font-semibold text-green-600">
                  Verified
                </span>

              </div>

            ))}

          </div>

        </div>

      </section>

    </div>
  );
}

export default Dashboard;