--
-- PostgreSQL database dump
--

\restrict TuTQbWe2qCFBBHJl1q03jPNN38B1HRpjIbDvXMYo7NaNseJRF0m8RDcqbiresM5

-- Dumped from database version 17.9 (Debian 17.9-1.pgdg13+1)
-- Dumped by pg_dump version 17.9 (Debian 17.9-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance_events; Type: TABLE; Schema: public; Owner: app_api
--

CREATE TABLE public.attendance_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_type character varying NOT NULL,
    event_at timestamp without time zone NOT NULL,
    payload_json jsonb,
    attendance_record_id uuid,
    qr_session_id uuid
);


ALTER TABLE public.attendance_events OWNER TO app_api;

--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: app_api
--

CREATE TABLE public.attendance_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    attendance_date date NOT NULL,
    check_in_at timestamp without time zone,
    check_out_at timestamp without time zone,
    status character varying DEFAULT 'ON_TIME'::character varying NOT NULL,
    late_minutes integer DEFAULT 0 NOT NULL,
    source character varying NOT NULL,
    device_info jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    employee_id uuid,
    qr_session_id uuid,
    branch_id uuid
);


ALTER TABLE public.attendance_records OWNER TO app_api;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: app_api
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    actor_user_id uuid NOT NULL,
    module character varying NOT NULL,
    action character varying NOT NULL,
    entity_name character varying NOT NULL,
    entity_id character varying NOT NULL,
    old_data jsonb,
    new_data jsonb,
    status character varying DEFAULT 'SUCCESS'::character varying NOT NULL,
    ip_address character varying,
    device_info jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO app_api;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: app_api
--

CREATE TABLE public.branches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    address character varying,
    latitude numeric(10,7),
    longitude numeric(10,7),
    status character varying DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    client_id uuid
);


ALTER TABLE public.branches OWNER TO app_api;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: app_api
--

CREATE TABLE public.clients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    ruc character varying NOT NULL,
    status character varying DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clients OWNER TO app_api;

--
-- Name: employee_schedule_assignments; Type: TABLE; Schema: public; Owner: app_api
--

CREATE TABLE public.employee_schedule_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    valid_from date NOT NULL,
    valid_to date,
    status character varying DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    employee_id uuid,
    schedule_id uuid
);


ALTER TABLE public.employee_schedule_assignments OWNER TO app_api;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: app_api
--

CREATE TABLE public.employees (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying NOT NULL,
    dni character varying NOT NULL,
    first_name character varying NOT NULL,
    last_name character varying NOT NULL,
    phone character varying,
    area character varying,
    "position" character varying,
    hire_date date,
    status character varying DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id uuid,
    supervisor_id uuid,
    branch_id uuid,
    client_id uuid,
    project_id uuid
);


ALTER TABLE public.employees OWNER TO app_api;

--
-- Name: incident_requests; Type: TABLE; Schema: public; Owner: app_api
--

CREATE TABLE public.incident_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    attendance_date date NOT NULL,
    request_type character varying NOT NULL,
    description text NOT NULL,
    status character varying DEFAULT 'PENDING'::character varying NOT NULL,
    reviewed_at timestamp without time zone,
    resolution_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    employee_id uuid,
    reviewed_by uuid
);


ALTER TABLE public.incident_requests OWNER TO app_api;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: app_api
--

CREATE TABLE public.projects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    status character varying DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    client_id uuid,
    branch_id uuid
);


ALTER TABLE public.projects OWNER TO app_api;

--
-- Name: qr_sessions; Type: TABLE; Schema: public; Owner: app_api
--

CREATE TABLE public.qr_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    issued_by uuid NOT NULL,
    token_hash character varying NOT NULL,
    starts_at timestamp without time zone NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    status character varying DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    branch_id uuid
);


ALTER TABLE public.qr_sessions OWNER TO app_api;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: app_api
--

CREATE TABLE public.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying NOT NULL,
    name character varying NOT NULL,
    description text
);


ALTER TABLE public.roles OWNER TO app_api;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: app_api
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL
);


ALTER TABLE public.user_roles OWNER TO app_api;

--
-- Name: users; Type: TABLE; Schema: public; Owner: app_api
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying NOT NULL,
    password_hash character varying NOT NULL,
    refresh_token_hash character varying,
    status character varying DEFAULT 'ACTIVE'::character varying NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO app_api;

--
-- Name: work_schedules; Type: TABLE; Schema: public; Owner: app_api
--

CREATE TABLE public.work_schedules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying NOT NULL,
    name character varying NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    tolerance_minutes integer DEFAULT 0 NOT NULL,
    work_days character varying NOT NULL,
    status character varying DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.work_schedules OWNER TO app_api;

--
-- Data for Name: attendance_events; Type: TABLE DATA; Schema: public; Owner: app_api
--

COPY public.attendance_events (id, event_type, event_at, payload_json, attendance_record_id, qr_session_id) FROM stdin;
\.


--
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: app_api
--

COPY public.attendance_records (id, attendance_date, check_in_at, check_out_at, status, late_minutes, source, device_info, created_at, updated_at, employee_id, qr_session_id, branch_id) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: app_api
--

COPY public.audit_logs (id, actor_user_id, module, action, entity_name, entity_id, old_data, new_data, status, ip_address, device_info, created_at) FROM stdin;
60ef1105-680d-44fc-9ee5-71cdb07b483f	069ca6bc-ab24-4325-a0ce-9dfbb63f27ea	users	CREATE	users	d819e968-63ae-4ccf-b63d-cadb30865efa	\N	{"email": "empleado1@consultora.com", "status": "ACTIVE"}	SUCCESS	\N	\N	2026-04-05 15:53:53.470514
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: app_api
--

COPY public.branches (id, name, address, latitude, longitude, status, created_at, updated_at, client_id) FROM stdin;
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: app_api
--

COPY public.clients (id, name, ruc, status, created_at, updated_at) FROM stdin;
cb897c8a-f9a1-407d-a42e-c94569a9e918	Consultora Demo SAC	20123456789	ACTIVE	2026-04-05 16:02:30.676511	2026-04-05 16:02:30.676511
\.


--
-- Data for Name: employee_schedule_assignments; Type: TABLE DATA; Schema: public; Owner: app_api
--

COPY public.employee_schedule_assignments (id, valid_from, valid_to, status, created_at, employee_id, schedule_id) FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: app_api
--

COPY public.employees (id, code, dni, first_name, last_name, phone, area, "position", hire_date, status, created_at, updated_at, user_id, supervisor_id, branch_id, client_id, project_id) FROM stdin;
\.


--
-- Data for Name: incident_requests; Type: TABLE DATA; Schema: public; Owner: app_api
--

COPY public.incident_requests (id, attendance_date, request_type, description, status, reviewed_at, resolution_note, created_at, updated_at, employee_id, reviewed_by) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: app_api
--

COPY public.projects (id, name, status, created_at, updated_at, client_id, branch_id) FROM stdin;
\.


--
-- Data for Name: qr_sessions; Type: TABLE DATA; Schema: public; Owner: app_api
--

COPY public.qr_sessions (id, issued_by, token_hash, starts_at, expires_at, status, created_at, branch_id) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: app_api
--

COPY public.roles (id, code, name, description) FROM stdin;
67b99400-6e52-4d5e-843b-045c4545e295	ADMIN	Administrador	Acceso total al sistema
dc144c88-cbcd-4448-80fd-56fcf757818b	RRHH	Recursos Humanos	Control formal de asistencia e incidencias
a395f965-3450-4898-8544-a6108e30c691	SUPERVISOR	Supervisor	Seguimiento del personal a cargo
1d054094-f9a8-4c13-b7cc-e441034bc4f6	EMPLOYEE	Empleado	Marcación y consulta de su propia asistencia
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: app_api
--

COPY public.user_roles (user_id, role_id) FROM stdin;
069ca6bc-ab24-4325-a0ce-9dfbb63f27ea	67b99400-6e52-4d5e-843b-045c4545e295
d819e968-63ae-4ccf-b63d-cadb30865efa	1d054094-f9a8-4c13-b7cc-e441034bc4f6
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: app_api
--

COPY public.users (id, email, password_hash, refresh_token_hash, status, last_login_at, created_at, updated_at) FROM stdin;
d819e968-63ae-4ccf-b63d-cadb30865efa	empleado1@consultora.com	$2b$10$mKnR/9ujdUayOuqYcO0UUulHkizAQFkGiAIdoB3bGdauhyGRJI25a	\N	ACTIVE	\N	2026-04-05 15:53:53.429695	2026-04-05 15:53:53.429695
069ca6bc-ab24-4325-a0ce-9dfbb63f27ea	admin@consultora.com	$2b$10$yJVgqrYYaaSIP3LRXWuBd.LaJZH.1WphfZ36ncCFlW4pLm.h1Er96	$2b$10$Shy0W3153ebaWA.DJgHEouvE7kVxRto/cLlrG8kiLe3OGYUYdEO9y	ACTIVE	2026-04-22 16:40:18.03	2026-04-04 21:27:18.545732	2026-04-22 21:40:18.113077
\.


--
-- Data for Name: work_schedules; Type: TABLE DATA; Schema: public; Owner: app_api
--

COPY public.work_schedules (id, code, name, start_time, end_time, tolerance_minutes, work_days, status, created_at, updated_at) FROM stdin;
\.


--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);


--
-- Name: user_roles PK_23ed6f04fe43066df08379fd034; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "PK_23ed6f04fe43066df08379fd034" PRIMARY KEY (user_id, role_id);


--
-- Name: qr_sessions PK_2688eade4d67a03899f3d7ab927; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.qr_sessions
    ADD CONSTRAINT "PK_2688eade4d67a03899f3d7ab927" PRIMARY KEY (id);


--
-- Name: incident_requests PK_44cca5238ea67b68776d5763445; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.incident_requests
    ADD CONSTRAINT "PK_44cca5238ea67b68776d5763445" PRIMARY KEY (id);


--
-- Name: projects PK_6271df0a7aed1d6c0691ce6ac50; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY (id);


--
-- Name: employee_schedule_assignments PK_689047377f9a672399ef8ed0917; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.employee_schedule_assignments
    ADD CONSTRAINT "PK_689047377f9a672399ef8ed0917" PRIMARY KEY (id);


--
-- Name: branches PK_7f37d3b42defea97f1df0d19535; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY (id);


--
-- Name: attendance_events PK_8d7140035888f869932307395ad; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT "PK_8d7140035888f869932307395ad" PRIMARY KEY (id);


--
-- Name: attendance_records PK_946920332f5bc9efad3f3023b96; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT "PK_946920332f5bc9efad3f3023b96" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: employees PK_b9535a98350d5b26e7eb0c26af4; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY (id);


--
-- Name: roles PK_c1433d71a4838793a49dcad46ab; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY (id);


--
-- Name: clients PK_f1ab7cf3a5714dbc6bb4e1c28a4; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY (id);


--
-- Name: work_schedules PK_f5251879700e5ca0d2e353fa34f; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.work_schedules
    ADD CONSTRAINT "PK_f5251879700e5ca0d2e353fa34f" PRIMARY KEY (id);


--
-- Name: employees REL_2d83c53c3e553a48dadb9722e3; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "REL_2d83c53c3e553a48dadb9722e3" UNIQUE (user_id);


--
-- Name: employees UQ_2f88c4dff473076e55ca2568d51; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "UQ_2f88c4dff473076e55ca2568d51" UNIQUE (code);


--
-- Name: employees UQ_6196007a1366caac15a821a6f32; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "UQ_6196007a1366caac15a821a6f32" UNIQUE (dni);


--
-- Name: clients UQ_8871e085e4697493f195e1ab056; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "UQ_8871e085e4697493f195e1ab056" UNIQUE (ruc);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: work_schedules UQ_e34752b575507568bd7c8214fb8; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.work_schedules
    ADD CONSTRAINT "UQ_e34752b575507568bd7c8214fb8" UNIQUE (code);


--
-- Name: roles UQ_f6d54f95c31b73fb1bdd8e91d0c; Type: CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "UQ_f6d54f95c31b73fb1bdd8e91d0c" UNIQUE (code);


--
-- Name: IDX_87b8888186ca9769c960e92687; Type: INDEX; Schema: public; Owner: app_api
--

CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON public.user_roles USING btree (user_id);


--
-- Name: IDX_b23c65e50a758245a33ee35fda; Type: INDEX; Schema: public; Owner: app_api
--

CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON public.user_roles USING btree (role_id);


--
-- Name: incident_requests FK_0c18adb1cc687caade6cfa86d1b; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.incident_requests
    ADD CONSTRAINT "FK_0c18adb1cc687caade6cfa86d1b" FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: attendance_records FK_0da27031c34e3ac444e0524809e; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT "FK_0da27031c34e3ac444e0524809e" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: employee_schedule_assignments FK_0f93e393c484d9a4565d9e04ad1; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.employee_schedule_assignments
    ADD CONSTRAINT "FK_0f93e393c484d9a4565d9e04ad1" FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: branches FK_181a8cdaff4e1db94ff147163e2; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT "FK_181a8cdaff4e1db94ff147163e2" FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: employees FK_181c77ee98271345a511cd02926; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "FK_181c77ee98271345a511cd02926" FOREIGN KEY (supervisor_id) REFERENCES public.employees(id);


--
-- Name: employees FK_2d83c53c3e553a48dadb9722e38; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "FK_2d83c53c3e553a48dadb9722e38" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: qr_sessions FK_32f3acae9a924a06b0d92d5b709; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.qr_sessions
    ADD CONSTRAINT "FK_32f3acae9a924a06b0d92d5b709" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: employees FK_457a39c666de2686596e502eb8c; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "FK_457a39c666de2686596e502eb8c" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: employees FK_66910c68073ee5ab9b47ac04941; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "FK_66910c68073ee5ab9b47ac04941" FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: projects FK_76f26b5caa097eeada5103f05ab; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "FK_76f26b5caa097eeada5103f05ab" FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: employee_schedule_assignments FK_8776e9358d448f3eecfd2e03f7f; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.employee_schedule_assignments
    ADD CONSTRAINT "FK_8776e9358d448f3eecfd2e03f7f" FOREIGN KEY (schedule_id) REFERENCES public.work_schedules(id);


--
-- Name: user_roles FK_87b8888186ca9769c960e926870; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: incident_requests FK_89305a339fd2f23c2d3d36e8d8e; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.incident_requests
    ADD CONSTRAINT "FK_89305a339fd2f23c2d3d36e8d8e" FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: user_roles FK_b23c65e50a758245a33ee35fda1; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: projects FK_ca29f959102228649e714827478; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "FK_ca29f959102228649e714827478" FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: attendance_events FK_d7c84155dadaf35c5cb97f9e4ba; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT "FK_d7c84155dadaf35c5cb97f9e4ba" FOREIGN KEY (qr_session_id) REFERENCES public.qr_sessions(id);


--
-- Name: attendance_records FK_e5440c860d6eac68dc22da95a67; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT "FK_e5440c860d6eac68dc22da95a67" FOREIGN KEY (qr_session_id) REFERENCES public.qr_sessions(id);


--
-- Name: attendance_events FK_e8c889af5b7e38e762d056daa74; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.attendance_events
    ADD CONSTRAINT "FK_e8c889af5b7e38e762d056daa74" FOREIGN KEY (attendance_record_id) REFERENCES public.attendance_records(id);


--
-- Name: attendance_records FK_f97d7be854091ef9ab5d75c0de3; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT "FK_f97d7be854091ef9ab5d75c0de3" FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: employees FK_ffa2febd9bb8d18e3899729b2cc; Type: FK CONSTRAINT; Schema: public; Owner: app_api
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "FK_ffa2febd9bb8d18e3899729b2cc" FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- PostgreSQL database dump complete
--

\unrestrict TuTQbWe2qCFBBHJl1q03jPNN38B1HRpjIbDvXMYo7NaNseJRF0m8RDcqbiresM5

