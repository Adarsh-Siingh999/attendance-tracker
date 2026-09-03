-- ==============================================================================
-- Attendance Management SaaS - PostgreSQL Schema & Row Level Security (RLS)
-- Target Platform: Supabase PostgreSQL
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Linked to auth.users)
create table if not exists public.profiles (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null unique,
    full_name text not null,
    institution text,
    program text,
    default_eligibility_threshold integer default 75,
    default_critical_threshold integer default 65,
    default_weekends jsonb default '[0, 6]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = user_id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = user_id);

create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = user_id);

-- 2. Semesters Table
create table if not exists public.semesters (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    academic_year text not null,
    start_date date not null,
    end_date date,
    eligibility_threshold integer default 75,
    critical_threshold integer default 65,
    weekends jsonb default '[0, 1]'::jsonb,
    is_active boolean default true,
    is_archived boolean default false,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.semesters enable row level security;

create policy "Users can CRUD their own semesters"
    on public.semesters for all
    using (auth.uid() = user_id);

-- 3. Subjects Table
create table if not exists public.subjects (
    id uuid primary key default uuid_generate_v4(),
    semester_id uuid references public.semesters(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    code text,
    credits numeric(3, 1) default 0,
    color text default '#2563eb',
    components jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.subjects enable row level security;

create policy "Users can CRUD their own subjects"
    on public.subjects for all
    using (auth.uid() = user_id);

-- 4. Timetable Entries Table
create table if not exists public.timetable_entries (
    id uuid primary key default uuid_generate_v4(),
    semester_id uuid references public.semesters(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    day_of_week integer not null check (day_of_week between 0 and 6),
    start_time text not null,
    end_time text not null,
    subject text not null,
    code text,
    class_type text not null default 'Lecture',
    room text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.timetable_entries enable row level security;

create policy "Users can CRUD their own timetable"
    on public.timetable_entries for all
    using (auth.uid() = user_id);

-- 5. Attendance Records Table
create table if not exists public.attendance_records (
    id uuid primary key default uuid_generate_v4(),
    semester_id uuid references public.semesters(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    record_date date not null,
    class_index integer not null,
    status text not null check (status in ('present', 'absent', 'cancelled', 'excused')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (semester_id, record_date, class_index)
);

alter table public.attendance_records enable row level security;

create policy "Users can CRUD their own attendance records"
    on public.attendance_records for all
    using (auth.uid() = user_id);

-- 6. Academic Calendar & Events Table
create table if not exists public.calendar_events (
    id uuid primary key default uuid_generate_v4(),
    semester_id uuid references public.semesters(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    event_type text not null check (event_type in ('holiday', 'exam', 'non-instructional', 'special-class')),
    name text not null,
    start_date date not null,
    end_date date,
    counts_as_class boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.calendar_events enable row level security;

create policy "Users can CRUD their calendar events"
    on public.calendar_events for all
    using (auth.uid() = user_id);

-- 7. Public Sharing Profiles (Read-only for public access)
create table if not exists public.public_profiles (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null unique,
    public_slug text not null unique,
    is_enabled boolean default false,
    privacy_settings jsonb default '{"showOverallAttendance":true,"showSubjectAttendance":true,"showSubjectNames":true,"showCourseCodes":false,"showTimetable":false,"showCalendar":false,"showInstitution":true}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.public_profiles enable row level security;

create policy "Owners can manage public profile"
    on public.public_profiles for all
    using (auth.uid() = user_id);

create policy "Anyone can read enabled public profiles"
    on public.public_profiles for select
    using (is_enabled = true);
