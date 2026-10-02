create extension if not exists pgcrypto;

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text unique,
    full_name text not null,
    avatar_url text,
    bio text,
    country text default 'Cameroon',
    city text,
    timezone text default 'Africa/Douala',
    github_url text,
    linkedin_url text,
    website_url text,
    years_experience integer default 0 check (years_experience >= 0),
    availability text default 'available'
        check (availability in ('available', 'busy', 'unavailable')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.skills (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    category text not null,
    description text,
    created_at timestamptz not null default now()
);

create table public.developer_skills (
    id uuid primary key default gen_random_uuid(),
    developer_id uuid not null references public.profiles(id) on delete cascade,
    skill_id uuid not null references public.skills(id) on delete cascade,
    proficiency text not null default 'beginner'
        check (proficiency in ('beginner','intermediate','advanced','expert')),
    years_experience numeric(4,1) default 0 check (years_experience >= 0),
    created_at timestamptz not null default now(),
    unique(developer_id, skill_id)
);

create table public.skill_evidence (
    id uuid primary key default gen_random_uuid(),
    developer_id uuid not null references public.profiles(id) on delete cascade,
    skill_id uuid not null references public.skills(id) on delete cascade,
    evidence_type text not null
        check (evidence_type in (
            'portfolio','github','project','certificate',
            'assessment','endorsement','other'
        )),
    title text not null,
    description text,
    url text,
    verified boolean not null default false,
    created_at timestamptz not null default now()
);

create table public.offers (
    id uuid primary key default gen_random_uuid(),
    developer_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    description text not null,
    status text not null default 'active'
        check (status in ('draft','active','paused','closed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.offer_skills (
    offer_id uuid not null references public.offers(id) on delete cascade,
    skill_id uuid not null references public.skills(id) on delete cascade,
    primary key (offer_id, skill_id)
);

create table public.needs (
    id uuid primary key default gen_random_uuid(),
    developer_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    description text not null,
    status text not null default 'active'
        check (status in ('draft','active','matched','closed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.need_skills (
    need_id uuid not null references public.needs(id) on delete cascade,
    skill_id uuid not null references public.skills(id) on delete cascade,
    primary key (need_id, skill_id)
);

create table public.matches (
    id uuid primary key default gen_random_uuid(),
    offer_id uuid references public.offers(id) on delete cascade,
    need_id uuid references public.needs(id) on delete cascade,
    offer_developer_id uuid not null references public.profiles(id) on delete cascade,
    need_developer_id uuid not null references public.profiles(id) on delete cascade,
    compatibility_score numeric(5,2)
        check (compatibility_score >= 0 and compatibility_score <= 100),
    explanation text,
    status text not null default 'suggested'
        check (status in ('suggested','viewed','accepted','rejected')),
    created_at timestamptz not null default now()
);

create table public.exchanges (
    id uuid primary key default gen_random_uuid(),
    match_id uuid references public.matches(id) on delete set null,
    title text not null,
    description text,
    status text not null default 'pending'
        check (status in (
            'pending','negotiating','accepted',
            'active','completed','cancelled'
        )),
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.exchange_participants (
    exchange_id uuid not null references public.exchanges(id) on delete cascade,
    developer_id uuid not null references public.profiles(id) on delete cascade,
    role text not null default 'participant'
        check (role in ('owner','participant')),
    joined_at timestamptz not null default now(),
    primary key (exchange_id, developer_id)
);

create table public.projects (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    description text not null,
    status text not null default 'open'
        check (status in (
            'idea','open','in_progress','completed','cancelled'
        )),
    repository_url text,
    demo_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.project_skills (
    project_id uuid not null references public.projects(id) on delete cascade,
    skill_id uuid not null references public.skills(id) on delete cascade,
    primary key (project_id, skill_id)
);

create table public.project_applications (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    developer_id uuid not null references public.profiles(id) on delete cascade,
    message text,
    status text not null default 'pending'
        check (status in ('pending','accepted','rejected','withdrawn')),
    created_at timestamptz not null default now(),
    unique(project_id, developer_id)
);

create table public.contributions (
    id uuid primary key default gen_random_uuid(),
    contributor_id uuid not null references public.profiles(id) on delete cascade,
    project_id uuid references public.projects(id) on delete cascade,
    exchange_id uuid references public.exchanges(id) on delete cascade,
    title text not null,
    description text not null,
    contribution_type text not null
        check (contribution_type in (
            'code','design','documentation',
            'testing','research','management','other'
        )),
    repository_url text,
    pull_request_url text,
    status text not null default 'claimed'
        check (status in (
            'claimed','under_review','verified','disputed'
        )),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.contribution_validations (
    id uuid primary key default gen_random_uuid(),
    contribution_id uuid not null
        references public.contributions(id) on delete cascade,
    validator_id uuid not null
        references public.profiles(id) on delete cascade,
    decision text not null
        check (decision in ('approved','rejected','needs_revision')),
    comment text,
    created_at timestamptz not null default now(),
    unique(contribution_id, validator_id)
);

create table public.problems (
    id uuid primary key default gen_random_uuid(),
    creator_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    description text not null,
    category text,
    location text,
    status text not null default 'open'
        check (status in ('open','in_progress','solved','closed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.problem_skills (
    problem_id uuid not null references public.problems(id) on delete cascade,
    skill_id uuid not null references public.skills(id) on delete cascade,
    primary key (problem_id, skill_id)
);

create table public.conversations (
    id uuid primary key default gen_random_uuid(),
    exchange_id uuid references public.exchanges(id) on delete cascade,
    project_id uuid references public.projects(id) on delete cascade,
    created_at timestamptz not null default now()
);

create table public.conversation_participants (
    conversation_id uuid not null
        references public.conversations(id) on delete cascade,
    developer_id uuid not null
        references public.profiles(id) on delete cascade,
    joined_at timestamptz not null default now(),
    primary key (conversation_id, developer_id)
);

create table public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null
        references public.conversations(id) on delete cascade,
    sender_id uuid not null
        references public.profiles(id) on delete cascade,
    content text not null,
    created_at timestamptz not null default now()
);

create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    type text not null,
    title text not null,
    message text not null,
    link text,
    read boolean not null default false,
    created_at timestamptz not null default now()
);

create index idx_developer_skills_developer
on public.developer_skills(developer_id);

create index idx_developer_skills_skill
on public.developer_skills(skill_id);

create index idx_offers_developer
on public.offers(developer_id);

create index idx_needs_developer
on public.needs(developer_id);

create index idx_matches_offer
on public.matches(offer_id);

create index idx_matches_need
on public.matches(need_id);

create index idx_projects_owner
on public.projects(owner_id);

create index idx_project_applications_project
on public.project_applications(project_id);

create index idx_contributions_contributor
on public.contributions(contributor_id);

create index idx_contributions_project
on public.contributions(project_id);

create index idx_problems_creator
on public.problems(creator_id);

create index idx_messages_conversation
on public.messages(conversation_id);

create index idx_notifications_user
on public.notifications(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger offers_updated_at
before update on public.offers
for each row
execute function public.set_updated_at();

create trigger needs_updated_at
before update on public.needs
for each row
execute function public.set_updated_at();

create trigger exchanges_updated_at
before update on public.exchanges
for each row
execute function public.set_updated_at();

create trigger projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

create trigger contributions_updated_at
before update on public.contributions
for each row
execute function public.set_updated_at();

create trigger problems_updated_at
before update on public.problems
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name)
    values (
        new.id,
        coalesce(
            new.raw_user_meta_data ->> 'full_name',
            'AfriDev Developer'
        )
    );

    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.developer_skills enable row level security;
alter table public.skill_evidence enable row level security;
alter table public.offers enable row level security;
alter table public.offer_skills enable row level security;
alter table public.needs enable row level security;
alter table public.need_skills enable row level security;
alter table public.matches enable row level security;
alter table public.exchanges enable row level security;
alter table public.exchange_participants enable row level security;
alter table public.projects enable row level security;
alter table public.project_skills enable row level security;
alter table public.project_applications enable row level security;
alter table public.contributions enable row level security;
alter table public.contribution_validations enable row level security;
alter table public.problems enable row level security;
alter table public.problem_skills enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

create policy "Profiles are viewable"
on public.profiles
for select
to authenticated
using (true);

create policy "Users insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Authenticated users view skills"
on public.skills
for select
to authenticated
using (true);

create policy "Users view developer skills"
on public.developer_skills
for select
to authenticated
using (true);

create policy "Users manage own developer skills"
on public.developer_skills
for all
to authenticated
using (auth.uid() = developer_id)
with check (auth.uid() = developer_id);

create policy "Users view skill evidence"
on public.skill_evidence
for select
to authenticated
using (true);

create policy "Users manage own skill evidence"
on public.skill_evidence
for all
to authenticated
using (auth.uid() = developer_id)
with check (auth.uid() = developer_id);

create policy "Users view offers"
on public.offers
for select
to authenticated
using (true);

create policy "Users manage own offers"
on public.offers
for all
to authenticated
using (auth.uid() = developer_id)
with check (auth.uid() = developer_id);

create policy "Users view needs"
on public.needs
for select
to authenticated
using (true);

create policy "Users manage own needs"
on public.needs
for all
to authenticated
using (auth.uid() = developer_id)
with check (auth.uid() = developer_id);

create policy "Users view matches"
on public.matches
for select
to authenticated
using (
    auth.uid() = offer_developer_id
    or auth.uid() = need_developer_id
);

create policy "Users view projects"
on public.projects
for select
to authenticated
using (true);

create policy "Users create projects"
on public.projects
for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Owners update projects"
on public.projects
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users view project applications"
on public.project_applications
for select
to authenticated
using (
    auth.uid() = developer_id
    or exists (
        select 1
        from public.projects
        where projects.id = project_id
        and projects.owner_id = auth.uid()
    )
);

create policy "Developers apply to projects"
on public.project_applications
for insert
to authenticated
with check (auth.uid() = developer_id);

create policy "Users view contributions"
on public.contributions
for select
to authenticated
using (true);

create policy "Users create contributions"
on public.contributions
for insert
to authenticated
with check (auth.uid() = contributor_id);

create policy "Users update own contributions"
on public.contributions
for update
to authenticated
using (auth.uid() = contributor_id)
with check (auth.uid() = contributor_id);

create policy "Users view problems"
on public.problems
for select
to authenticated
using (true);

create policy "Users create problems"
on public.problems
for insert
to authenticated
with check (auth.uid() = creator_id);

create policy "Users update own problems"
on public.problems
for update
to authenticated
using (auth.uid() = creator_id)
with check (auth.uid() = creator_id);

create policy "Users view notifications"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users update notifications"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);