--
-- PostgreSQL database dump
--

\restrict 9RGz2ewCxN1xiNJcdCXsoV8fzXTUab5uezNpSb4UeWWaSbFleWny4K9MFzM2bti

-- Dumped from database version 18.1 (Debian 18.1-2)
-- Dumped by pg_dump version 18.1 (Debian 18.1-2)

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
-- Name: approvalstatus; Type: TYPE; Schema: public; Owner: biology_user
--

CREATE TYPE public.approvalstatus AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.approvalstatus OWNER TO biology_user;

--
-- Name: approvaltype; Type: TYPE; Schema: public; Owner: biology_user
--

CREATE TYPE public.approvaltype AS ENUM (
    'login',
    'exam_start'
);


ALTER TYPE public.approvaltype OWNER TO biology_user;

--
-- Name: userrole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.userrole AS ENUM (
    'admin',
    'student'
);


ALTER TYPE public.userrole OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: answers; Type: TABLE; Schema: public; Owner: biology_user
--

CREATE TABLE public.answers (
    id integer NOT NULL,
    question_id integer NOT NULL,
    option_label character varying(1) NOT NULL,
    answer_text text NOT NULL,
    is_correct boolean NOT NULL
);


ALTER TABLE public.answers OWNER TO biology_user;

--
-- Name: answers_id_seq; Type: SEQUENCE; Schema: public; Owner: biology_user
--

CREATE SEQUENCE public.answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.answers_id_seq OWNER TO biology_user;

--
-- Name: answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: biology_user
--

ALTER SEQUENCE public.answers_id_seq OWNED BY public.answers.id;


--
-- Name: approvals; Type: TABLE; Schema: public; Owner: biology_user
--

CREATE TABLE public.approvals (
    id character varying(36) NOT NULL,
    approval_type public.approvaltype NOT NULL,
    status public.approvalstatus NOT NULL,
    user_id integer,
    username character varying(80) NOT NULL,
    telegram_user_id bigint,
    test_id integer,
    variant_number integer,
    request_message_id integer,
    requested_at timestamp with time zone NOT NULL,
    responded_at timestamp with time zone,
    resolved_by_telegram_id bigint,
    consumed_at timestamp with time zone,
    notes text NOT NULL,
    allowed_variants integer[]
);


ALTER TABLE public.approvals OWNER TO biology_user;

--
-- Name: attempt_answers; Type: TABLE; Schema: public; Owner: biology_user
--

CREATE TABLE public.attempt_answers (
    id integer NOT NULL,
    attempt_id integer NOT NULL,
    question_id integer NOT NULL,
    selected_option character varying(1) NOT NULL
);


ALTER TABLE public.attempt_answers OWNER TO biology_user;

--
-- Name: attempt_answers_id_seq; Type: SEQUENCE; Schema: public; Owner: biology_user
--

CREATE SEQUENCE public.attempt_answers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attempt_answers_id_seq OWNER TO biology_user;

--
-- Name: attempt_answers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: biology_user
--

ALTER SEQUENCE public.attempt_answers_id_seq OWNED BY public.attempt_answers.id;


--
-- Name: attempt_questions; Type: TABLE; Schema: public; Owner: biology_user
--

CREATE TABLE public.attempt_questions (
    id integer NOT NULL,
    attempt_id integer NOT NULL,
    question_id integer NOT NULL,
    order_index integer NOT NULL
);


ALTER TABLE public.attempt_questions OWNER TO biology_user;

--
-- Name: attempt_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: biology_user
--

CREATE SEQUENCE public.attempt_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attempt_questions_id_seq OWNER TO biology_user;

--
-- Name: attempt_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: biology_user
--

ALTER SEQUENCE public.attempt_questions_id_seq OWNED BY public.attempt_questions.id;


--
-- Name: attempts; Type: TABLE; Schema: public; Owner: biology_user
--

CREATE TABLE public.attempts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    test_id integer NOT NULL,
    started_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    submitted_at timestamp with time zone,
    score integer NOT NULL,
    total_questions integer NOT NULL,
    is_submitted boolean NOT NULL,
    exam_signature character varying(1000) DEFAULT ''::character varying,
    variant_index integer DEFAULT 1
);


ALTER TABLE public.attempts OWNER TO biology_user;

--
-- Name: attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: biology_user
--

CREATE SEQUENCE public.attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attempts_id_seq OWNER TO biology_user;

--
-- Name: attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: biology_user
--

ALTER SEQUENCE public.attempts_id_seq OWNED BY public.attempts.id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: biology_user
--

CREATE TABLE public.questions (
    id integer NOT NULL,
    test_id integer NOT NULL,
    order_index integer NOT NULL,
    prompt text NOT NULL,
    option_a text NOT NULL,
    option_b text NOT NULL,
    option_c text NOT NULL,
    option_d text NOT NULL,
    correct_option character varying(1) NOT NULL,
    explanation text NOT NULL,
    image_path character varying(500),
    option_e text DEFAULT ''::character varying,
    is_image_required boolean DEFAULT false,
    table_html text
);


ALTER TABLE public.questions OWNER TO biology_user;

--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: biology_user
--

CREATE SEQUENCE public.questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questions_id_seq OWNER TO biology_user;

--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: biology_user
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: test_variants; Type: TABLE; Schema: public; Owner: biology_user
--

CREATE TABLE public.test_variants (
    id integer NOT NULL,
    variant_number integer NOT NULL,
    question_ids integer[] NOT NULL,
    total_questions integer NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.test_variants OWNER TO biology_user;

--
-- Name: test_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: biology_user
--

CREATE SEQUENCE public.test_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.test_variants_id_seq OWNER TO biology_user;

--
-- Name: test_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: biology_user
--

ALTER SEQUENCE public.test_variants_id_seq OWNED BY public.test_variants.id;


--
-- Name: tests; Type: TABLE; Schema: public; Owner: biology_user
--

CREATE TABLE public.tests (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text NOT NULL,
    duration_minutes integer NOT NULL,
    points_per_question integer NOT NULL,
    total_questions integer NOT NULL,
    allow_retake boolean NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.tests OWNER TO biology_user;

--
-- Name: tests_id_seq; Type: SEQUENCE; Schema: public; Owner: biology_user
--

CREATE SEQUENCE public.tests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tests_id_seq OWNER TO biology_user;

--
-- Name: tests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: biology_user
--

ALTER SEQUENCE public.tests_id_seq OWNED BY public.tests.id;


--
-- Name: user_approvals; Type: TABLE; Schema: public; Owner: biology_user
--

CREATE TABLE public.user_approvals (
    id integer NOT NULL,
    telegram_user_id bigint,
    username character varying(255) NOT NULL,
    approved_variants integer[],
    approved_at timestamp with time zone,
    expires_at timestamp with time zone,
    status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.user_approvals OWNER TO biology_user;

--
-- Name: user_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: biology_user
--

CREATE SEQUENCE public.user_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_approvals_id_seq OWNER TO biology_user;

--
-- Name: user_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: biology_user
--

ALTER SEQUENCE public.user_approvals_id_seq OWNED BY public.user_approvals.id;


--
-- Name: user_variant_permissions; Type: TABLE; Schema: public; Owner: biology_user
--

CREATE TABLE public.user_variant_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    variant_id integer NOT NULL
);


ALTER TABLE public.user_variant_permissions OWNER TO biology_user;

--
-- Name: user_variant_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: biology_user
--

CREATE SEQUENCE public.user_variant_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_variant_permissions_id_seq OWNER TO biology_user;

--
-- Name: user_variant_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: biology_user
--

ALTER SEQUENCE public.user_variant_permissions_id_seq OWNED BY public.user_variant_permissions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: biology_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(80) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.userrole NOT NULL,
    is_approved boolean NOT NULL,
    is_rejected boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    session_expires_at timestamp with time zone,
    approval_requested_at timestamp with time zone,
    allowed_variant_index integer,
    allowed_variants_all boolean DEFAULT false,
    can_create_exam boolean DEFAULT false,
    can_access_all_tests boolean DEFAULT false,
    telegram_user_id bigint,
    approved_at timestamp with time zone,
    allowed_variants integer[]
);


ALTER TABLE public.users OWNER TO biology_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: biology_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO biology_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: biology_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: variant_questions; Type: TABLE; Schema: public; Owner: biology_user
--

CREATE TABLE public.variant_questions (
    id integer NOT NULL,
    variant_id integer NOT NULL,
    question_id integer NOT NULL,
    order_index integer NOT NULL
);


ALTER TABLE public.variant_questions OWNER TO biology_user;

--
-- Name: variant_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: biology_user
--

CREATE SEQUENCE public.variant_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.variant_questions_id_seq OWNER TO biology_user;

--
-- Name: variant_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: biology_user
--

ALTER SEQUENCE public.variant_questions_id_seq OWNED BY public.variant_questions.id;


--
-- Name: variants; Type: TABLE; Schema: public; Owner: biology_user
--

CREATE TABLE public.variants (
    id integer NOT NULL,
    test_id integer NOT NULL,
    variant_number integer NOT NULL
);


ALTER TABLE public.variants OWNER TO biology_user;

--
-- Name: variants_id_seq; Type: SEQUENCE; Schema: public; Owner: biology_user
--

CREATE SEQUENCE public.variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.variants_id_seq OWNER TO biology_user;

--
-- Name: variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: biology_user
--

ALTER SEQUENCE public.variants_id_seq OWNED BY public.variants.id;


--
-- Name: answers id; Type: DEFAULT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.answers ALTER COLUMN id SET DEFAULT nextval('public.answers_id_seq'::regclass);


--
-- Name: attempt_answers id; Type: DEFAULT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.attempt_answers ALTER COLUMN id SET DEFAULT nextval('public.attempt_answers_id_seq'::regclass);


--
-- Name: attempt_questions id; Type: DEFAULT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.attempt_questions ALTER COLUMN id SET DEFAULT nextval('public.attempt_questions_id_seq'::regclass);


--
-- Name: attempts id; Type: DEFAULT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.attempts ALTER COLUMN id SET DEFAULT nextval('public.attempts_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: test_variants id; Type: DEFAULT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.test_variants ALTER COLUMN id SET DEFAULT nextval('public.test_variants_id_seq'::regclass);


--
-- Name: tests id; Type: DEFAULT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.tests ALTER COLUMN id SET DEFAULT nextval('public.tests_id_seq'::regclass);


--
-- Name: user_approvals id; Type: DEFAULT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.user_approvals ALTER COLUMN id SET DEFAULT nextval('public.user_approvals_id_seq'::regclass);


--
-- Name: user_variant_permissions id; Type: DEFAULT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.user_variant_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_variant_permissions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: variant_questions id; Type: DEFAULT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.variant_questions ALTER COLUMN id SET DEFAULT nextval('public.variant_questions_id_seq'::regclass);


--
-- Name: variants id; Type: DEFAULT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.variants ALTER COLUMN id SET DEFAULT nextval('public.variants_id_seq'::regclass);


--
-- Data for Name: answers; Type: TABLE DATA; Schema: public; Owner: biology_user
--

COPY public.answers (id, question_id, option_label, answer_text, is_correct) FROM stdin;
1	1	A	Faqat I	t
2	1	B	Faqat II	f
3	1	C	Faqat III	f
4	1	D	I va III	f
5	1	E	I,II va III	f
6	2	A	Replikatsiya — Meyoz I — Meyoz II — Differensiyalanish	t
7	2	B	Replikatsiya — Mitoz — Meyoz II — Differensiyalanish	f
8	2	C	Duplikatsiya — Meyoz II — Meyoz I — Differensiyalanish	f
9	2	D	Replikatsiya — Meyoz I — Mitoz — Differensiyalanish	f
10	2	E	Transkripsiya — Meyoz I — Meyoz II — Mitoz	f
11	3	A	sorgo	f
12	3	B	jo’xori	t
13	3	C	makkajo’xori	f
14	3	D	qo’ng’ribosh	f
15	4	A	Irsiyat molekulasi nima ekanligini aniqlash	t
16	4	B	DNKning replikatsiya mexanizmini tushuntirish	f
17	4	C	RNK molekulasining ahamiyatini aniqlash	f
18	4	D	Bakteriofagning ko'payish siklini tushuntirish	f
19	5	A	T,N,T	f
20	5	B	T,T,T	f
21	5	C	N,T,N	f
22	5	D	N,N,N	t
23	6	A	1,4,6	f
24	6	B	2,3,6	f
25	6	C	2,4,5	f
26	6	D	4,5,6	t
27	7	A	1,3,6	f
28	7	B	3,5,6	f
29	7	C	1,2,4	t
30	7	D	1,4,6	f
31	8	A	lansetnik	f
32	8	B	oq amur	f
33	8	C	kapcha ilon	f
34	8	D	qurbaqa	t
35	9	A	2,4,5	t
36	9	B	2,3,6	f
37	9	C	1,4,5	f
38	9	D	1,2,6	f
39	10	A	Faqat I	f
40	10	B	Faqat II	t
41	10	C	I va II	f
42	10	D	II va III	f
43	10	E	I, II va III	f
44	11	A	a-3,b-4,d-1,e-2	f
45	11	B	a-2,b-4,d-1,e-3.	t
46	11	C	a-2,b-3,d-1,e-4	f
47	11	D	a-2,b-1,d-4,e-3	f
48	12	A	Ⅰ	t
49	12	B	Ⅲ	f
50	12	C	Ⅱ	f
51	12	D	Ⅳ	f
52	13	A	Yozuvchi muskulning qisqarishi bilan 2-raqamli harakat sodir bo‘ladi.	f
53	13	B	1-raqamli harakatni bukuvchi muskul amalga oshiradi.	f
54	13	C	1 va 2 raqamli harakatlarning ikkalasida ham energiya (ATF) sarflanadi.	f
55	13	D	Yozuvchi muskul tolalari qisqarganda 1-raqamli harakat sodir bo‘ladi.	t
56	13	E	Bukuvchi muskulning qisqarishi natijasida 2-raqamli harakatga qarama-qarshi harakat yuzaga keladi.	f
57	14	A	biogeotsenoz	f
58	14	B	populatsiya	f
59	14	C	biosfera	t
60	14	D	organizm	f
61	15	A	2	f
62	15	B	8	f
63	15	C	3	t
64	15	D	1	f
65	16	A	Faqat II	f
66	16	B	I va II	t
67	16	C	I va III	f
68	16	D	II va III	f
69	16	E	I, II va III	f
70	17	A	TNTN	f
71	17	B	TNNT	f
72	17	C	TNTT	f
73	17	D	NNTN	t
74	18	A	turlararo	f
75	18	B	tur ichida	t
76	18	C	populatsiyalararo	f
77	18	D	abiotik omillarga qarshi	f
78	19	A	72	f
79	19	B	36	t
80	19	C	48	f
81	19	D	24	f
82	20	A	1,2,6	f
83	20	B	2,3,5	f
84	20	C	1,4,6	t
85	20	D	2,4,6	f
86	21	A	2mol	f
87	21	B	1mol	t
88	21	C	3mol	f
89	21	D	4mol	f
90	22	A	ikki urug’pallali	f
91	22	B	to’pguli murakkab soyabon	f
92	22	C	yorug’sevar o’simliklar	t
93	22	D	poyasi yog’ochlashgan	f
94	23	A	TTT	t
95	23	B	NNT	f
96	23	C	NTT	f
97	23	D	TNN	f
98	24	A	Tasodifiy Guruhli Bir – tekis	f
99	24	B	Bir – tekis Guruhli Tasodifiy	f
100	24	C	Guruhli Tasodifiy Bir – tekis	t
101	24	D	Tasodifiy Bir – tekis Guruhli	f
102	24	E	Bir – tekis Tasodifiy Guruhli	f
103	25	A	10800	t
104	25	B	12000	f
105	25	C	4800	f
106	25	D	14400	f
107	26	A	nevrit	t
108	26	B	nevralgiya	f
109	26	C	poliomiyelit	f
110	26	D	fenilkutonoriya	f
111	27	A	3,6	f
112	27	B	2,7	t
113	27	C	1,5	f
114	27	D	2,4	f
115	28	A	Faqat I	t
116	28	B	Faqat II	f
117	28	C	I va II	f
118	28	D	I va III	f
119	28	E	II va III	f
120	29	A	Ⅰ-3,Ⅲ-2	t
121	29	B	Ⅱ-4,Ⅲ-5	f
122	29	C	Ⅳ-2,V-1	f
123	29	D	Ⅰ-3,Ⅲ-5	f
124	30	A	Ⅳ-4 kamerali yurak	f
125	30	B	Ⅲ-o'pka orqali nafas olish	f
126	30	C	Ⅰ-suyak	t
127	30	D	Ⅱ-bosh miya	f
128	31	A	Faqat I	f
129	31	B	Faqat II	f
130	31	C	Faqat III	f
131	31	D	I va III	f
132	31	E	I, II va III	t
133	32	A	2,3,7,13	f
134	32	B	3,10,11,12	t
135	32	C	1,2,10,11	f
136	32	D	2,10,12,13	f
137	33	A	1,2,4	f
138	33	B	1,2,3	f
139	33	C	2,3,4	f
140	33	D	1,3,4	t
141	34	A	Pivo achitqisi eng faol bo'ladigan shakar eritmasi konsentratsiyasini	f
142	34	B	Pivo achitqisining metabolik faolligi bilan muhit harorati orasidagi bog'liqlikni	t
143	34	C	Pivo achitqisi iste'mol qilgan shakar miqdorini	f
144	34	D	Shakar + pivo achitqisi eritmasi bo'lgan probirkadan qaysi gaz chiqayotganini	f
145	34	E	Shakar + pivo achitqisi eritmasi bilan oddiy shakar eritmasi orasidagi osmotic bosim farqini	f
146	35	A	1	f
147	35	B	4	f
148	35	C	3	f
149	35	D	5	t
150	36	A	Bilish, tushunish, qo‘llash, tahlil qilish, sintez qilish, baholash	t
151	36	B	Yodlash va qayta takrorlash	f
152	36	C	Faqatgina tushunish va qo‘llash	f
153	36	D	Amaliy mashg‘ulotlarga e’tibor bermaslik	f
154	37	A	O‘quvchilarning mustaqil ta’lim olish usuli	f
155	37	B	O‘qituvchi rahbarligida belgilangan vaqt davomida ta’lim jarayonining asosiy shakli	t
156	37	C	Mustaqil ish va o‘quvchilar bilan savol-javobdan iborat ta’lim shakli	f
157	37	D	Faqat nazariy bilim beriladigan ta’lim shakli	f
158	38	A	An’anaviy dars	f
159	38	B	Mustaqil ish darsi	f
160	38	C	Dars-seminar, dars-musobaqa, dars-sayohat	t
161	38	D	Bilimlarni takrorlash darsi	f
162	39	A	O‘z-o‘zini ishontirish	t
163	39	B	Faqat amaliy mashg‘ulotlar o‘tkazish	f
164	39	C	O‘z-o‘zini jazolashsiz ish yuritish	f
165	39	D	Faqat darsliklar bo‘yicha ishlash	f
166	40	A	Texnologik, kommunikativ va didaktik kompetensiyalarga	t
167	40	B	Faqat o‘z fanini yaxshi bilishi kerak	f
168	40	C	O‘quvchilarga do‘stona munosabatda bo‘lish	f
169	40	D	Ta’lim jarayonini nazorat qilish	f
170	41	A	Tushunish	f
171	41	B	Qo‘llash	t
172	41	C	Baholash	f
173	41	D	Sintez	f
174	42	A	Suhbat	f
175	42	B	Illyustratsiya	f
176	42	C	Interfaol metod	t
177	42	D	Tushuntirish	f
178	43	A	Psixologik	t
179	43	B	Metadologik	f
180	43	C	Pedagogik	f
181	43	D	Uslubiy	f
182	44	A	O‘z-o‘zini belgilash	f
183	44	B	O‘z-o‘zini anglash	t
184	44	C	O‘z-o‘zini bilish	f
185	44	D	O‘z-o‘zini nazorat qilish	f
186	45	A	Ikkala o‘quvchining ota-onasini chaqirib, ularning farzandlarini ogohlantirish kerak	f
187	45	B	Bu kabi vaziyatlarga aralashmaslik kerak, o‘quvchilar o‘zlari hal qiladi	f
188	45	C	Vaziyatni chuqur o‘rganib, sinfda do‘stona muhit yaratishga qaratilgan suhbatlar tashkil etish, barcha o‘quvchilarni jamoaviy mas’uliyatga jalb qilish lozim	t
189	45	D	Ikkala o‘quvchini vaqtincha boshqa joylarga o‘tkazish haqida rahbariyatga murojaat qilish kerak	f
190	46	A	O‘quvchi bilan individual suhbat o‘rnatib, uning qiziqishlarini aniqlashga harakat qilaman.	t
191	46	B	O‘quvchini darsga qaytarib jalb qilish uchun motivatsion gaplar aytaman	f
192	46	C	Darsni yanada qiziqarli va interaktiv qilish uchun yangi metodlarni joriy qilaman	f
193	46	D	O‘quvchini sabrli bo‘lishga undayman va uning fikrini inobatga olgan holda darsni davom ettiraman	f
194	47	A	Tashxislash	f
195	47	B	Rag‘batlantirish	f
196	47	C	Axborot tahlili	f
197	47	D	Bashoratlash	t
198	48	A	Tushunish va murosa qilish yo‘li ko‘rsatilgan usul	t
199	48	B	E’tiborsizlik ko‘rsatish usuli	f
200	48	C	Kuch bilan bostirish yo‘li	f
201	48	D	Raqobat asosida hal etish usuli	f
202	49	A	O‘qituvchi o‘z mutaxassisligi bo‘yicha chuqur va puxta bilimga ega bo‘lishi, barcha fanlar integratsiyasini o‘zlashtirish, bunday o‘qitishda uzluksiz ilmiy izlanishlar olib borishi lozim	t
203	49	B	O‘qituvchi faqat bir fan bo‘yicha bilimlarni chuqurlashtirishga harakat qilishi kerak	f
204	49	C	O‘qituvchi yangi metodlar o‘rganishga va qo‘llashga vaqt ajratmasligi kerak	f
205	49	D	O‘qituvchi faqat darsliklardan foydalanib, o‘quvchilarga ta’lim berish	f
206	50	A	Ta’limda tasvir metodi	t
207	50	B	Ta’limda tanqidiy fikrlash metodi	f
208	50	C	Ta’limda guruhli ishlash metodi	f
209	50	D	Ta’limda izohli metod	f
210	51	A	1 ta	f
211	51	B	2 ta	t
212	51	C	3 ta	f
213	51	D	4 ta	f
214	52	A	240	t
215	52	B	360	f
216	52	C	120	f
217	52	D	60	f
218	53	A	4	t
219	53	B	3	f
220	53	C	5	f
221	53	D	2	f
222	54	A	No'xatlarda binafsha gul rangi oq gul rangi ustidan dominant	f
223	54	B	1-grafikda chatishtirilgan binafsha gulning genotipi gomozigotadir	f
224	54	C	2-grafikdagi chatishtirish natijasida hosil bo'lgan binafsha gulli no'xatlarning barchasi geterozigotadir	f
225	54	D	3-grafikda chatishtirilgan oq gulli no'xatlar bilan yangi hosil bo'lgan oq gulli no'xatlarning genotiplari bir-biridan farq qiladi	t
226	54	E	1, 2 va 3-grafiklarda chatishtirilgan oq gulli no'xatlarning genotipi gomozigotadir	f
227	55	A	Yashash uchun kurash	f
228	55	B	Tabiiy tanlanish	t
229	55	C	Populatsiya chastotasi	f
230	55	D	Mutatsiya	f
231	56	A	Fe	f
232	56	B	Ca	f
233	56	C	Zn	f
234	56	D	N	f
235	56	E	Mg	t
236	57	A	metabolik funksiya | plastikfunksiyasi | strukturafunksiyasi | himoyafunksiyasi	f
237	57	B	retseptorlik funksiyasi | plastikfunksiyasi | strukturafunksiyasi | zaxirafunksiyasi	f
238	57	C	retseptorlik funksiyasi | strukturafunksiyasi | plastikfunksiyasi | himoyafunksiyasi	t
239	57	D	struktura funksiyasi | strukturafunksiyasi | retseptorlikfunksiyasi | energetikfunksiya	f
240	58	A	1,2,6	t
241	58	B	2,6	f
242	58	C	1,5,6	f
243	58	D	3,6	f
244	59	A	gidrofill	f
245	59	B	gidrofob	t
246	59	C	tashqi gidrofill ichki gidrofob	f
247	59	D	tashqi gidrofob ichki gidrofill	f
248	60	A	sinaps bo’shlig’i	f
249	60	B	retseptor	f
250	60	C	motoneyron	t
251	60	D	vesikula	f
252	61	A	II - I – III	f
253	61	B	I - II – III	t
254	61	C	III - II – I	f
255	61	D	I - III – II	f
256	61	E	II - III – I	f
257	62	A	360	f
258	62	B	90	f
259	62	C	180	t
260	62	D	240	f
261	63	A	2	f
262	63	B	8	t
263	63	C	3	f
264	63	D	1	f
265	64	A	1I,5A,10B	t
266	64	B	2E,7L,8F	f
267	64	C	3G,4H,6K	f
268	64	D	1K,6I,8L	f
269	65	A	yo’nalishi bo’yicha harakatlanadigan ovqatlar glyukoza va aminokislotalar kabi moddalardir.	f
270	65	B	K organi jigar bo’lib, u ba’zi ovqat hazm qilish mahsulotlarini ortiqcha miqdorda saqlaydi	f
271	65	C	M strukturasi peke sistemasi bo’lib, yog’ kislotalari va yog’da eriydigan vitaminlarni o’z ichiga oladi.	f
272	65	D	--à yo’nalishda tashiladigan moddalar yurakdan o’tishdan oldin jigar orqali o’tadi	t
273	66	A	500-600 nm oraliqdagi to'lqin uzunligida yashil suvo'tlar kamroq fotosintez qiladi	f
274	66	B	Yorug'likning to'lqin uzunligi ortishi bilan fotosintez tezligi ham doimiy ravishda ortadi, deb umumlashtirish mumkin emas	f
275	66	C	Tajriba qizil suvo'tlar bilan o'tkazilsa ham, grafikdagi ma'lumotlar xuddi shunday bo'ladi	t
276	66	D	Binafsha rangli to'lqin uzunligida fotosintez tezligi yuqori	f
277	66	E	Fotosintez tezligining har xil to'lqin uzunligida turlicha bo'lishi xlorofillning nurni yutish darajasi bilan bog'liq	f
278	67	A	a4,d3,g2	t
279	67	B	a4,b1,f3	f
280	67	C	b4,d3,f6	f
281	67	D	b1,e3,g2	f
282	68	A	TNNT	t
283	68	B	TNTN	f
284	68	C	NNTT	f
285	68	D	NTNN	f
286	69	A	1,3,6	f
287	69	B	2,3,5	f
288	69	C	1,2,5	t
289	69	D	1,4,6	f
290	70	A	2B,5D,9I	f
291	70	B	1I,4B,8K	f
292	70	C	2J,6E,10I	t
293	70	D	3B,7E,9K	f
294	71	A	2mol	t
295	71	B	1mol	f
296	71	C	3mol	f
297	71	D	4mol	f
298	72	A	Faqat I	t
299	72	B	Faqat II	f
300	72	C	Faqat III	f
301	72	D	I va II	f
302	72	E	II va III	f
303	73	A	Pepsin fermenti faqat kislotali muhitda ishlaydi	f
304	73	B	Dekarboksilaza fermenti pepsin bilan bir xil muhitda ishlay olmaydi	f
305	73	C	Amilaza va dekarboksilaza fermentlarining optimum (eng yaxshi) pH qiymatlari har xil	f
306	73	D	Dekarboksilaza fermenti ishlay oladigan barcha muhitlarda arginaz fermenti ham ishlay oladi	t
307	73	E	Arginaz va amilaza fermentlarining birgalikda ishlay oladigan pH oralig'i mavjud	f
308	74	A	4,6	f
309	74	B	2,5	f
310	74	C	1,2	f
311	74	D	3,5	t
312	75	A	1,3,4	f
313	75	B	1,2,5	f
314	75	C	1,4,5	f
315	75	D	2,3,4	t
316	76	A	Faqat I	f
317	76	B	I va II	f
318	76	C	I va III	f
319	76	D	II va III	f
320	76	E	I, II va III	t
321	77	A	150kg	f
322	77	B	50kg	f
323	77	C	1500kg	t
324	77	D	500kg	f
325	78	A	1D,3A,5B	t
326	78	B	2E,3B,4F	f
327	78	C	2E,4F,5A	f
328	78	D	1E,3F,4A	f
329	79	A	Transpiratsiya (bug'lanishni)	t
330	79	B	Ildiz bosimi	f
331	79	C	Koheziya kuchi (suv molekulalarini bir biriga yopishish kuchi)	f
332	79	D	Fotosintez tezligi	f
333	79	E	Nafas olishning fotosintezga nisbati	f
334	80	A	3-H,6-E,8-A	t
335	80	B	1-I,4-F,7-A	f
336	80	C	2-D,6-G,9-F	f
337	80	D	1-K,5-B,7-H	f
338	81	A	Faqat I	f
339	81	B	Faqat II	f
340	81	C	I va II	f
341	81	D	I va III	f
342	81	E	I, II va III	t
343	82	A	a – glitsirin; b – glikoproteinlar	f
344	82	B	a – glitsirin; b – glikolipid	f
345	82	C	a – glikolipid; b – glitsirin	f
346	82	D	a – glikoproteinlar; b – glitsirin	t
347	83	A	a3,d6,e5	t
348	83	B	b5,d6,g4	f
349	83	C	a3,e5,f4	f
350	83	D	b6,f1,g4	f
351	84	A	Fotosintez tezligi stoma ochilish darajasiga to‘g‘ri proporsional ravishda o‘zgaradi.	t
352	84	B	9 °C dagi stoma ochilish darajasi bilan 32 °C dagi stoma ochilish darajasi birbiriga yaqin.	f
353	84	C	20 °C gacha stoma hujayralarida turgor bosimi ortadi.	f
354	84	D	Yuqori harorat transpiratsiyani (bug‘lanishni) oshirganligi sababli stomalar yopilgan.	f
355	84	E	Harorat stomaning ochilib-yopilishini ta'minlovchi belgilovchi omillardan biridir.	f
356	85	A	1,3,9	t
357	85	B	2,5,7	f
358	85	C	2,4,5	f
359	85	D	1,4,7	f
360	86	A	O‘qituvchining dars o‘tishda texnologik vositalarni qo‘llash qobiliyati	t
361	86	B	Texnik jihozlardan foydalanish majburiyati	f
362	86	C	Kompyuterda ishlash qobiliyati	f
363	86	D	Dars rejasini kompyuterda yozish	f
364	87	A	Texnologik, kommunikativ va didaktik kompetensiyalarga	t
365	87	B	Faqat o‘z fanini yaxshi bilishi kerak	f
366	87	C	O‘quvchilarga do‘stona munosabatda bo‘lish	f
367	87	D	Ta’lim jarayonini nazorat qilish	f
368	88	A	Tarbiyaviy talab	f
369	88	B	Rivojlantiruvchi talab	f
370	88	C	Ta’limiy talab	t
371	88	D	Nazorat talabi	f
372	89	A	Tarbiyaviy, rivojlantiruvchi, ta’limiy talablar	t
373	89	B	Faoliyat, baholash va test talablar	f
374	89	C	Nazorat, jazo va rag‘batlantirish	f
375	89	D	Mashg‘ulotlar, seminarlar va nazorat ishlari	f
376	90	A	Yangi materialni tushuntirish, mustahkamlash, bilimlarni tekshirish, baholash	t
377	90	B	Faqat yangi materialni o‘rganish	f
378	90	C	Nazorat ishi va test yechish	f
379	90	D	Mustaqil ish va darslik bilan ishlash	f
380	91	A	1, 2, 3	f
381	91	B	2, 3, 4	f
382	91	C	1, 3, 4	f
383	91	D	1, 2, 4	t
384	92	A	Namoyish	f
385	92	B	Loyiha	f
386	92	C	Didaktik o‘yin	t
387	92	D	Hikoya	f
388	93	A	Ikkala o‘quvchini ham jazolab, ota-onalariga shikoyat qilish.	f
389	93	B	O‘quvchilarning har birining fikrini tinch va xolis tinglab, ularni kelishuvga chaqirish.	t
390	93	C	O‘quvchilarni boshqa sinflarga o‘tkazish.	f
391	93	D	O‘quvchilarning o‘zaro munosabatini sudga topshirish.	f
392	94	A	Ishontirish	f
393	94	B	Iltimos	f
394	94	C	Suhbat	t
395	94	D	Talab qo‘yish	f
396	95	A	Rahbar buyrug‘i	f
397	95	B	Suhbat	f
398	95	C	Sud qarori	t
399	95	D	Komissiya	f
400	96	A	Tahlil	t
401	96	B	Sintez	f
402	96	C	Baholash	f
403	96	D	Bilish	f
404	97	A	Tasvir	f
405	97	B	Hikoya	f
406	97	C	Ma'ruza	f
407	97	D	Tushuntirish	t
408	98	A	Psixologik	f
409	98	B	Metadologik	t
410	98	C	Pedagogik	f
411	98	D	Uslubiy	f
412	99	A	O‘z-o‘zini anglash	f
413	99	B	O‘z-o‘zini belgilash	t
414	99	C	O‘z-o‘zini bilish	f
415	99	D	O‘z-o‘zini rivojlantirish	f
416	100	A	Tarixiy voqealarni o‘quvchilarga interaktiv o‘yinlar orqali tushuntirib, darsni qiziqarli qilishga harakat qiladi	t
417	100	B	O‘quvchilarga tarixiy mavzularni guruhlar bilan muhokama qilishni va o‘z fikrlarini erkin bildirishni taklif etadi	f
418	100	C	Tarixiy voqealarni o‘quvchilarning kundalik hayoti bilan bog‘lab, ularni tushunishga yordam beradi	f
419	100	D	O‘quvchilarga tarixiy voqealar bo‘yicha qisqa videolar va vizual materiallar ko‘rsatadi	f
420	101	A	Faqat I	f
421	101	B	Faqat II	f
422	101	C	Faqat III	f
423	101	D	I va II	f
424	101	E	I,II va III	t
425	102	A	1/16	t
426	102	B	1/8	f
427	102	C	3/16	f
428	102	D	1/4	f
429	103	A	BB	t
430	103	B	AO	f
431	103	C	OO	f
432	103	D	BO	f
433	104	A	AA	t
434	104	B	Aa	f
435	104	C	aa	f
436	104	D	AA yoki Aa	f
437	105	A	1 - 2 - 3 - 4 – 5	f
438	105	B	1 - 2 - 5 - 4 – 3	f
439	105	C	2 - 3 - 4 - 1 – 5	f
440	105	D	5 - 4 - 2 - 3 - 1	f
441	105	E	5 - 4 - 3 - 2 – 1	t
442	106	A	sinaps bo’shlig’i	t
443	106	B	retseptor	f
444	106	C	postsinaptik membrana	f
445	106	D	vesikula	f
446	107	A	Idish ichidagi namlik miqdorining ortishi	f
447	107	B	Idish ichidagi havo bosimining o'zgarishi	f
448	107	C	Idishdagi kislorod (O2) miqdorining kamayishi	f
449	107	D	CO2 yutuvchi — kalsiy gidroksid (Ca(OH)2) eritmasi tiniqligining yo'qolishi (loyqalanishi)	f
450	107	E	Shisha naychadagi rangli suyuqlikning 18 raqami yo'nalishida harakatlanishi	t
451	108	A	TTTNTN	t
452	108	B	TTTNTT	f
453	108	C	NTTNTN	f
454	108	D	TTNNTN	f
455	109	A	20520	t
456	109	B	369360	f
457	109	C	1140	f
458	109	D	19440	f
459	110	A	X Y Z I II III	f
460	110	B	X Y Z I III II	t
461	110	C	X Y Z II I III	f
462	110	D	X Y Z II III I	f
463	110	E	X Y Z III II I	f
464	111	A	G1	t
465	111	B	sintez	f
466	111	C	G2	f
467	111	D	anafaza	f
468	112	A	Qon va boshqa to'qimalar orasidagi modda almashinuvi Z tomirida amalga oshadi	f
469	112	B	X tomirining qon bosimi Y tomirinikidan yuqori	f
470	112	C	Z tomiri doimo karbonat angidridga boy qon tashiydi	f
471	112	D	Y tomiridagi qonning oqish tezligi X tomirinikidan yuqori	t
472	112	E	Y tomiri doimo kislorodga boy qon tashiydi	f
473	113	A	qora boyalich,buyurg`un, shuvoq | baliqko`z, qizil sho`ra,sarsazan | saksovul, sag`an,qumtariq, juzg`un,silen, iloq	f
474	113	B	saksovul, sag`an,qumtariq, juzg`un, silen,iloq | baliqko`z, qizil sho`ra,sarsazan | qora boyalich,buyurg`un, shuvoq	f
475	113	C	qumtariq, sarsazan,baliqko’z | qora boyalich, saksovul,yantoq, shuvoq | silen iloq, juzg’un	f
476	113	D	baliqko`z, qizil sho`ra | juzg’un, silen, iloq | qora boyalich,buyurg`un, shuvoq	t
477	114	A	1,2,4,12	f
478	114	B	2,3,6,11	f
479	114	C	4,5,8,14	t
480	114	D	2,3,5,9	f
481	115	A	TNNT	f
482	115	B	NTTN	f
483	115	C	NNTN	f
484	115	D	NNTT	t
485	116	A	1,2,3	f
486	116	B	2,3,4	f
487	116	C	1,4	t
488	116	D	2,3	f
489	117	A	Faqat I	f
490	117	B	Faqat II	f
491	117	C	Faqat III	f
492	117	D	I va II	t
493	117	E	II va III	f
494	118	A	Faqat III	f
495	118	B	I va II	f
496	118	C	I va III	t
497	118	D	II va III	f
498	118	E	I, II va III	f
499	119	A	1,3,7,11	f
500	119	B	1,4,6,11	t
501	119	C	2,4,5,12	f
502	119	D	1,2,8,10	f
503	120	A	Ⅰ-4-d, Ⅱ-1-b	f
504	120	B	Ⅰ-3-b, Ⅱ-4-c	f
505	120	C	Ⅰ-1-b, Ⅱ-2-d	f
506	120	D	Ⅰ-4-a, Ⅱ-1-d	t
507	121	A	I va II	f
508	121	B	I va III	f
509	121	C	III va V	f
510	121	D	I, III va IV	t
511	121	E	I, III, IV va V	f
512	122	A	I va II	f
513	122	B	I va III	f
514	122	C	III va V	f
515	122	D	I, III va IV	t
516	122	E	I, III, IV va V	f
517	123	A	a va b	f
518	123	B	b va c	f
519	123	C	c	t
520	123	D	b	f
521	124	A	5,5	f
522	124	B	1-2 oralig’i	f
523	124	C	7,4	t
524	124	D	11-13 oralig’i	f
525	125	A	1/3	f
526	125	B	2/4	f
527	125	C	1/4	f
528	125	D	2/3	t
529	126	A	I-e; II-f; III-d; IV-a; V-c; VI-b	t
530	126	B	I-c; II-f; III-d; IV-e; V-a; VI-b	f
531	126	C	I-d; II-e; III-b; IV-a; V-c; VI-f	f
532	126	D	I-e; II-c; III-a; IV-b; V-f; VI-d	f
533	127	A	Faqat III	f
534	127	B	faqat IV	f
535	127	C	I va III	f
536	127	D	II va IV	f
537	127	E	III va IV	t
538	128	A	Faqat I	f
539	128	B	I va II	f
540	128	C	I va III	f
541	128	D	II va III	f
542	128	E	I,II va III	t
543	129	A	2,3,5	t
544	129	B	2,4,5	f
545	129	C	1,4,6	f
546	129	D	1,4,5	f
547	130	A	20%	f
548	130	B	10%	t
549	130	C	15%	f
550	130	D	25%	f
551	131	A	I raqami antigen bilan ilk bor to'qnash kelishni ko'rsatmoqda.	f
552	131	B	II raqami birlamchi javobni ifodalaydi.	f
553	131	C	III raqami aynan o'sha antigen bilan qayta uchrashish holatidir.	f
554	131	D	IV raqami ikkilamchi javobdir va xotira hujayralari faoldir.	f
555	131	E	V raqami aynan o'sha antigen bilan uchinchi marta to'qnash kelish holatidir	t
556	132	A	b-transversiya bo’lib sitozin adeninga aylanadi	f
557	132	B	b-tranzitsiya bo’lib sitozin timinga aylanadi	t
558	132	C	a-tranzitsiya bo’lib adenin guaninga aylanadi	f
559	132	D	b-transversiya bo’lib guanin timinga aylanadi	f
560	133	A	Qisqa kun o'simliklarida tun uzunligi kritik qiymatdan past bo'lganda gullash sodir bo'lmaydi.	f
561	133	B	Qisqa kun o'simliklarida tun uzunligi kritik qiymatdan yuqori bo'lsa, o'simlik gullaydi.	f
562	133	C	Uzun kun o'simliklarida tun uzunligi kritik qiymatdan past bo'lganda gullash sodir bo'ladi, kritik qiymatdan yuqori bo'lganda esa o'simlik gullamaydi.	f
563	133	D	Uzun kun o'simliklarida tun uzunligi kritik qiymatdan yuqori bo'lsa ham, qorong'u davr yorug'lik bilan bo'linsa (kesilsa), o'simlik gullaydi.	f
564	133	E	Qisqa kun o'simliklarida qorong'u davr yorug'lik bilan bo'linsa, gullash sodir bo'ladi.	t
565	134	A	Ⅱ va VⅠ	f
566	134	B	Ⅲ va V	f
567	134	C	Ⅱ va VⅠ	f
568	134	D	Ⅲ va VⅡ	t
569	135	A	Faqat I	f
570	135	B	Faqat II	f
571	135	C	Faqat III	f
572	135	D	I va III	f
573	135	E	I, II va III	t
574	136	A	O‘quvchilarga bilim berish va baholash	t
575	136	B	O‘quvchilar bilan mustaqil ish olib borish	f
576	136	C	O‘quvchilar bilan muloqot qilish	f
577	136	D	Faqat nazariy materialni tushuntirish	f
578	137	A	Aralash darslar	f
579	137	B	Bilimlarni mustahkamlash darslari	f
580	137	C	O‘quvchilar bilan sayohat darslari	t
581	137	D	Yangi material bilan tanishish darslari	f
582	138	A	Nutq madaniyati, mimika, pantomimika, jest, so‘zlash madaniyati	t
583	138	B	Faqat jiddiylik	f
584	138	C	O‘quvchilarga faqat yozma topshiriqlar berish	f
585	138	D	Faqat auditoriyada dars o‘tish	f
586	139	A	Yangi materialni tushuntirish, mustahkamlash, bilimlarni tekshirish, baholash	t
587	139	B	Faqat yangi materialni o‘rganish	f
588	139	C	Nazorat ishi va test yechish	f
589	139	D	Mustaqil ish va darslik bilan ishlash	f
590	140	A	Faqat nazariy bilimlar	f
591	140	B	O‘qituvchining shaxsiy qobiliyatlari	f
592	140	C	Kasbiy bilim, malaka va ko‘nikmalar yig‘indisi	t
593	140	D	O‘quv dasturining to‘g‘ri tanlanishi	f
594	141	A	1, 2, 3	f
595	141	B	2, 3, 4	f
596	141	C	1, 3, 4	t
597	141	D	1, 2, 4	f
598	142	A	Suhbat	f
599	142	B	Iltimos	t
600	142	C	Ishontirish	f
601	142	D	Ogohlantirish	f
602	143	A	Tushuntirish	f
603	143	B	Namoyish	t
604	143	C	Amaliy	f
605	143	D	Tasvir	f
606	144	A	Bahslashayotganlarni darhol darsdan chiqarib yuborish.	f
607	144	B	Sinf oldida qattiq tanbeh berish.	f
608	144	C	Tinchlikni tiklab, suhbatsiz jazo berish.	f
609	144	D	Suhbat orqali har ikki tomonning fikrini inobatga olib, nizoni adolatli hal qilish.	t
610	145	A	Zamonaviy axborot texnologiyalarini fanga singdirish.	f
611	145	B	Dars vaqtini oqilona rejalashtirish, darsning maqsad, shakl va usullarni aniqlash	t
612	145	C	Oʻquvchilarning bilimini baholash natijasida olingan maʼlumotlarni inobatga olgan holda rejalarni muvofiqlashtirish.	f
613	145	D	Fanlararo kompetensiyalarni fanga singdirish, oʻz fanini boshqa fanlar bilan oʻzaro bogʻlash.	f
614	146	A	Oʻzining taʼlim faoliyatini yetarlicha baholash va kasbiy rivojlanish ehtiyojlarini belgilay olish	t
615	146	B	Oʻz tajribasini namoyish etish uchun ochiq darslarga tayyorgarlik koʻrish va oʻtkazish.	f
616	146	C	Oʻzining ish amaliyotida kerakli oʻzgarishlarni amalga oshirish.	f
617	146	D	Oʻzining taʼlim faoliyatini tahlil qilish va baholash, modifikatsiyani talab qiladigan yoʻnalishlarni aniqlash	f
618	147	A	O'quv jarayonini rejalashtirish	f
619	147	B	Ta'lim samaradorligini taminlash	f
620	147	C	O'zlashtirishni baholash va qayta aloqani taqdim etish	t
621	147	D	Hamkasblar va ta'lim oluvchilarning ota-onalari bilan hamkorlik	f
622	148	A	Tushunish	f
623	148	B	Bilish	t
624	148	C	Qo‘llash	f
625	148	D	Tahlil	f
626	149	A	Bilish	f
627	149	B	Tushunish	f
628	149	C	Qo‘llash	f
629	149	D	Yaratish	t
630	150	A	Iltimos	f
631	150	B	Suhbat	t
632	150	C	Ishontirish	f
633	150	D	Sud qarori	f
634	151	A	Autosomadagi dominant tipidaga kaslik	t
635	151	B	Autosomadagi retsessiv tipidagi kaslik	f
636	151	C	X – xromosomaga birikkan dominant tipidagi kaslik	f
637	151	D	X – xromosomaga birikkan retsessiv tipidagi kaslik	f
638	152	A	adrenalin - vazopressin	t
639	152	B	adrenalin - tiroksin	f
640	152	C	adrenalin - glyukogon	f
641	152	D	adrenalin - oksitotsin	f
642	153	A	2,3,4;	f
643	153	B	6,9,3;	t
644	153	C	5,7,8;	f
645	153	D	1,6,2;	f
646	154	A	1 – yirtqichlik; 2 – bo'ri; 3 – sichqon; 4 – ukki	f
647	154	B	1 – hamxo'rak; 2 – yenot; 3 – qo'ng'ir ayiq; 4 –arslon	f
648	154	C	1 – konkurensiya; 2 – bo'ri; 3 – quyon; 4 –boyqush	t
649	154	D	1 – antogonistik; 2 – qoplon; 3 – sichqon; 4 –tasqara	f
650	155	A	35,8;	f
651	155	B	60;	t
652	155	C	50,33;	f
653	155	D	30,6;	f
654	156	A	Y – xromosomaga birikkan kaslik	t
655	156	B	Sitoplazmatik irsiylanishga oid kasalik	f
656	156	C	X – xromosomaga birikkan dominant tipidagi kaslik	f
657	156	D	X – xromosomaga birikkan retsessiv tipidagi kaslik	f
658	157	A	4, 6;	t
659	157	B	1, 3;	f
660	157	C	2, 5;	f
661	157	D	5, 6;	f
662	158	A	1, 4, 5;	f
663	158	B	2, 4, 3;	f
664	158	C	2, 3, 1;	f
665	158	D	4, 5, 2;	t
666	159	A	Faqat I	f
667	159	B	Faqat II	f
668	159	C	Faqat III	t
669	159	D	I va II	f
670	159	E	II va III	f
671	160	A	1 – hashoratlar tuxumlari bilan oziqlanadi; 2 – daraxt, butalar po'stlog'i orasidagi mayda hashoratlar bilan oziqlanadi; 3 – o'simlik urug'lari bilan oziqlanadi.	t
672	160	B	1 – bog'larda yirik hashoratlar bilan oziqlanadi; 2 – hashoratlar tuxumlari va qurtlari bilan oziqlanadi; 3 – daraxt, butalar po'stlog'i orasidagi mayda hashoratlar bilan oziqlanadi.	f
673	160	C	1 – hashoratlar tuxumlari va qurtlari bilan oziqlanadi; 2 – bog'larda yirik hashoratlar bilan oziqlanadi; 3 – o'simlik urug'lari bilan oziqlanadi.	f
674	160	D	1 – o'simlik urug'lari bilan oziqlanadi; 2 – daraxt, butalar po'stlog'i orasidagi mayda hashoratlar bilan oziqlanadi; 3 – hashoratlar qurtlari bilan oziqlanadi.	f
675	161	A	Faqat I	f
676	161	B	Faqat II	t
677	161	C	I va II	f
678	161	D	II va III	f
679	161	E	I, II va III	f
680	162	A	a - 3, 5, 6; b - 1, 4, 5	f
681	162	B	a - 1 ,2 , 6; b - 3, 4, 5	f
682	162	C	a - 4, 5, 6; b - 1, 3, 5	f
683	162	D	a - 1, 5, 6; b - 2, 3, 4	t
684	163	A	а–5; b–9;	t
685	163	B	а–6; b–10;	f
686	163	C	а–5; b–10;	f
687	163	D	а–9; b–10;	f
688	164	A	1 – а, 2 – с, 3 – b ;	t
689	164	B	1 – с, 2 – а, 3 – b;	f
690	164	C	1 – а, 2 – с, 3 – d;	f
691	164	D	1 – d, 2 – а, 3 – b.	f
692	165	A	1 – d; 2 – а; 3 – с; 5 – b;	t
693	165	B	1 – c; 2 – b; 3 – с; 5 – а;	f
694	165	C	1 – d; 2 – b; 4 – с; 5 – а;	f
695	165	D	1 – d; 2 – а; 4 – с; 5 – b;	f
696	166	A	2,5;	f
697	166	B	1,2,5	f
698	166	C	1, 3, 5;	t
699	166	D	3,5,6;	f
700	167	A	Faqat III	t
701	167	B	I va II	f
702	167	C	I va III	f
703	167	D	II va III	f
704	167	E	I, II va III	f
705	168	A	7-nukleotidning tranzitsiyasi	f
706	168	B	9-nukleotidning transversiyasi	f
707	168	C	4-nukleotidning tranzitsiyasi	f
708	168	D	18-nukleotidning tranversiyasis	t
709	169	A	3,4;	f
710	169	B	1,2;	f
711	169	C	3,5;	t
712	169	D	4,5.	f
713	170	A	1-d; 2-c; 3-h; 4-a	f
714	170	B	1-a; 2-b; 3-c; 4-d	t
715	170	C	1-b; 2-c; 3-d; 4-a	f
716	170	D	1-е; 2-d; 3-a; 4-b	f
717	171	A	a-6,7,9,3; b-2,10,4	f
718	171	B	a-8,10,4,1; b-6,3,9	f
719	171	C	a-2,1,10; b-3,9,6	f
720	171	D	a-8,1,4; b-9,7,5	t
721	172	A	a-Bo’yi 150–160 sm; b-Kromanyon	t
722	172	B	c-Bo’yi 155–165 sm; d- Avstralopitek	f
723	172	C	e-Kalla suyagining hajmi 500–600 sm3; b-Neandertal;	f
724	172	D	a-Bo’yi 120–140 sm; d- Homo habilis	f
725	173	A	1, 4, 5;	f
726	173	B	2, 3, 4;	f
727	173	C	1, 3, 5;	t
728	173	D	1, 2, 5;	f
729	174	A	a-divergensiya; b-makroevolutsiya; с- konvergensiya	f
730	174	B	a-mikroevolutsiya; b- divergensiya; с-makroevolutsiya	f
731	174	C	a-mikroevolutsiya; b-makroevolutsiya; с-divergensiya	t
732	174	D	a-makroevolutsiya; b-mikroevolutsiya; с-konvergensiya	f
733	175	A	4, 3, 2, 5, 1	f
734	175	B	4, 3, 5, 1, 2	f
735	175	C	4, 5, 3, 2, 1	t
736	175	D	5, 4, 2, 3, 1	f
737	176	A	ikkinchi tartib qoqish pat	t
738	176	B	par	f
739	176	C	birinchi tartib qoqish pat	f
740	176	D	momiq pat	f
741	177	A	shakli o'zgargan yer ustki novda; 1–zirk; 2–tok	f
742	177	B	shakli o'zgargan yer ostki novda;1–yantoq; 2–no'xat	f
743	177	C	shakli o'zgargan yer ustki barg; 1–akatsiya; 2–tok	f
744	177	D	shakli o'zgargan novda ; 1–do'lana; 2–tok	t
745	178	A	hujayra	f
746	178	B	organ	f
747	178	C	populyatsiya	f
748	178	D	organizm	t
749	179	A	а,c,e;	f
750	179	B	b,d,e;	f
751	179	C	а,c,f;	t
752	179	D	а,d,e;	f
753	180	A	Faqat II	f
754	180	B	I va II	t
755	180	C	I va III	f
756	180	D	II va III	f
757	180	E	I, II va III	f
758	181	A	2i,5j,8a	f
759	181	B	1k,4j,6e	t
760	181	C	1k,5g,8i	f
761	181	D	2b,3h,10i	f
762	182	A	2i,5j,8a	f
763	182	B	1k,4j,6e	t
764	182	C	1k,5g,8i	f
765	182	D	2b,3h,10i	f
766	183	A	K-L parazitizm L-M mutualizm	f
767	183	B	K-L mutualizm L-M kommensalizm	t
768	183	C	K-L kommensalizm L-M parazitizm	f
769	183	D	K-L parazitizm L-M kommensalizm	f
770	184	A	3, 4	t
771	184	B	5, 7	f
772	184	C	1 ,6	f
773	184	D	3, 6	f
774	185	A	2J,5D,9H,10I	f
775	185	B	1K,4F,6A,8E	f
776	185	C	2J,6G,8E,10I	t
777	185	D	3B,5D,7A,9K	f
778	186	A	1,2,4	f
779	186	B	1,2,3,4	f
780	186	C	1,2,3	t
781	186	D	2,3,4	f
782	187	A	iltimos	f
783	187	B	tushuntirish	t
784	187	C	suhbat	f
785	187	D	kuch bilan bostirish	f
786	188	A	induksiya	f
787	188	B	deduksiya	t
788	188	C	analogiya	f
789	189	A	induksiya	t
790	189	B	deduksiya	f
791	189	C	analogiya	f
792	190	A	1,2,3,4,5,6,7,8	f
793	190	B	1,3,4,5,6,7,8	f
794	190	C	1,2,3,4,5,6,7	t
795	190	D	1,2,4,5,6,7	f
796	191	A	Ta’lim jarayonini loyihalash	f
797	191	B	Ta’lim jarayonini tashkil etish	t
798	191	C	Ta’lim sifatini monitoring qilish va baholash	f
799	191	D	Oʻquvchilar bilan psixologik-pedagogik ishlarni olib boorish	f
800	192	A	Tasvir	t
801	192	B	Tushuntirish	f
802	192	C	Ilyustratsiya	f
803	192	D	Hikoya	f
804	193	A	Tarbiyaning aniqligi	f
805	193	B	Tarbiyaning uzluksizligi	f
806	193	C	Tarbiyani rejalashtirish	f
807	193	D	Tarbiyaning maqsadga yoʻnaltirilganligi	t
808	194	A	amaliy metod	f
809	194	B	suhbat metodi	f
810	194	C	namoyish	f
811	194	D	ma’ruza	t
812	195	A	O‘quvchilarning intizomini kuchaytirish uchun	f
813	195	B	Butun o‘quvchilar jamoasi bilan yaxlit o‘zaro ijobiy munosabat tashkil etish	t
814	195	C	Fan materialini osonroq tushuntirish uchun	f
815	195	D	O‘quvchilarni baholashni yengillashtirish uchun	f
816	196	A	Oʻquvchilarda fuqarolik kompetensiyalari va media savodxonligini shakllantirish	t
817	196	B	Insoniyatni rivojlantirish, oʻqitish va tarbiyalashning klassik va zamonaviy nazariyalarini	f
818	196	C	Oʻquvchilarga zamonaviy ommaviy axborot vositalari dunyosida xavfsiz ishlashga yordam berish	f
819	196	D	Shaxslararo va ijtimoiy muloqot jarayonlarini	f
820	197	A	bilish	f
821	197	B	qo`llash	f
822	197	C	sintez	f
823	197	D	tahlil qilish	t
824	198	A	ota-onasini chaqirib suhbat o`tkazadi	f
825	198	B	hayajonlanmasligi uchun doskaga umuman chiqarmaydi	f
826	198	C	psixolog bilan gaplashadi	t
827	198	D	hamkasblari bilan muxokama qiladi	f
828	199	A	Taʼlimning aniq va oʻlchanadigan natijalarini, shuningdek ushbu natijalarga erishishda aniq muddatlar uchun vazifalarni aniqlash va ularni rejalarda shakllantirish.	t
829	199	B	Oʻquvchilarning bilimini baholash natijasida olingan maʼlumotlarni inobatga olgan holda rejalarni muvofiqlashtirish.	f
830	199	C	Fanlararo kompetensiyalarni fanga singdirish, oʻz fanini boshqa fanlar bilan oʻzaro bogʻlash (korrelyatsiya).	f
831	199	D	Zamonaviy axborot texnologiyalarini fanga singdirish.	f
832	200	A	obyekt va sub’yektning o`zaro munosabati	f
833	200	B	tarbiyaviy reja asosida tarbiyalashning bir maqsadga yo`naltirilganligi	t
944	227	C	III – fikr to’g’ri	f
834	200	C	uzluksiz faoliyatli tarbiyaviy jarayon	f
835	200	D	guruh jamoasida norasmiy yetakchining xatti-harakati va xulq-atvori bilan tarbiyalash	f
836	201	A	1 – glyukoza; 2 – fruktoza	f
837	201	B	1 – yog’ kislota; 2 – glitserin	f
838	201	C	1 – D vitamini; 2 – C vitamini	f
839	201	D	1 – fruktoza; 2 – aminokislota	f
840	201	E	1 – galaktoza; 2 – yog’ kislotasi	t
841	202	A	faqat II	f
842	202	B	II va III	f
843	202	C	I,II va III	f
844	202	D	I,II,III va IV	t
845	202	E	I,III va IV	f
846	203	A	Viru'sning ko'paya olishi uchun bakteriya hujayrasi ichida bo'lishi kerak.	f
847	203	B	Viru's bakteriya hujayrasining ferment sistemalari va ishlab chiqargan ATFdan foydalanadi.	f
848	203	C	Faqatgina bakteriyalarni zararlay oladigan virus hisoblanadi.	f
849	203	D	Bakteriya hujayrasiga genetik materialini nusxalagan virus, oqsil qobig'ini bakteriya hujayrasida sintezlay boshlaydi.	f
850	203	E	Hayot siklining so'ngida bakteriofaglar o'z fermentlari bilan bakteriya hujayrasini parchalaydi.	t
851	204	A	a-Bo’yi 150–160 sm; b-Kromanyon	t
852	204	B	c-Bo’yi 155–165 sm; d- Avstralopitek	f
853	204	C	e-Kalla suyagining hajmi 500–600 sm3; b-Neandertal;	f
854	204	D	a-Bo’yi 120–140 sm; d- Homo habilis	f
855	205	A	faqat I	t
856	205	B	faqat II	f
857	205	C	faqat III	f
858	205	D	I va II	f
859	205	E	I va III	f
860	206	A	1-a; 2-b; 3-e	f
861	206	B	1-a; 2-e; 3-f	t
862	206	C	1-e; 2-a; 3-d	f
863	206	D	1-f; 2-b; 3-a	f
864	207	A	TNTN	f
865	207	B	NNTT	f
866	207	C	TNNT	f
867	207	D	NNTT	t
868	208	A	X - Go'sht	f
869	208	B	Y - Sariyog'	f
870	208	C	Z Guruch	f
871	208	D	X – Sut	f
872	208	E	Z - Tuxum oqi	t
873	209	A	a-1, 3; b-2, 4; с-5, 6	t
874	209	B	a-2, 3; b-4, 5; с-1, 6	f
875	209	C	a-1, 4; b-2, 6; с-3, 5	f
876	209	D	a-3, 5; b-1, 4; с-2, 6	f
877	210	A	1, 4, 5	f
878	210	B	2, 4, 6	f
879	210	C	2, 3, 6	t
880	210	D	1, 3, 6	f
881	211	A	1, 3, 6	t
882	211	B	2, 4, 5	f
883	211	C	3, 5, 6	f
884	211	D	1, 2, 4	f
885	212	A	432000	t
886	212	B	550000	f
887	212	C	44000	f
888	212	D	400000	f
889	214	A	I va II	t
890	214	B	II va III	f
891	214	C	III va IV	f
892	214	D	I,II va III	f
893	214	E	I,II va IV	f
894	215	A	Faqat II	f
895	215	B	Faqat III	f
896	215	C	I va II	f
897	215	D	II va III	f
898	215	E	I, II va III Hujayra tashqarisidagi K+ ioni konsentiratsiyasi Hujayraichidagi K+ ioni konsentiratsiyasi	t
899	216	A	X	f
900	216	B	Y	f
901	216	C	Z	f
902	216	D	T	f
903	216	E	V	t
904	217	A	4	f
905	217	B	6	t
906	217	C	8	f
907	217	D	10	f
908	217	E	12	f
909	218	A	I va II	f
910	218	B	I va IV	f
911	218	C	II va III	f
912	218	D	I,III va IV	t
913	218	E	II,III va IV	f
914	219	A	I - 2, 5; II - 3, 8	f
915	219	B	I - 4, 6; II - 2, 7	f
916	219	C	I - 1, 5; II - 4, 7	f
917	219	D	I - 1, 3; II - 4, 7	t
918	220	A	a-divergensiya; b-makroevolutsiya; с- konvergensiya	f
919	220	B	a-mikroevolutsiya; b- divergensiya; с-makroevolutsiya	f
920	220	C	a-mikroevolutsiya; b-makroevolutsiya; с-divergensiya	f
921	220	D	a-makroevolutsiya; b-mikroevolutsiya; с-konvergensiya	t
922	221	A	4, 3, 2, 5, 1	f
923	221	B	4, 3, 5, 1, 2	f
924	221	C	4, 5, 3, 2, 1	t
925	221	D	5, 4, 2, 3, 1	f
926	222	A	400	f
927	222	B	480	f
928	222	C	800	f
929	222	D	500	t
930	223	A	ayrim baliqlarmeduzalar vaaktiniyalarningpaypaslagichlariorasiga yashirinibolishi | Ayrim baliq turlari,yirik baliqlar terisini,jabra va og’izbo’shlig’iniparazitlardantozalab berishi | Dukkaklio’simliklarningildizida uchraydigantugunakbakteriyalarinihamkorlikdagimunosabati	f
931	223	B	tuproqda yashovchisaprofit bakteriyalarvao’simliklaro’rtasidagi munosabat | Qushlar, kemiruvchihayvonlarninguyalarida turlio’rgimchaksimonlar vahasharotlarni yashashi | Termitlar vaularning ichagidayashovchi birhujayrali xivchinlilaro’rtasidagimunosabatlar	f
932	223	C	Ayrim baliq turlari,yirik baliqlarterisini, jabra vaog’iz boshlig’iniparazitlardan tozalabberishi | daraxtlarning tanasi vashoxlarida epifito’simliklar(orxideya, yo’sinlar) valishayniklar joylashibolishi | Mikorizaqalpoqchalizamburug’lar vayuksak o’simliklaro’rtasidagimunosabat	t
933	223	D	Termitlar vaularning ichagidayashovchi birhujayrali xivchinlilaro’rtasidagimunosabatlar | Ayrim baliq turlari,yirik baliqlar terisini,jabra va og’izbo’shlig’iniparazitlardantozalab berishi | tuproqda yashovchisaprofit bakteriyalarvao’simliklaro’rtasidagimunosabat	f
934	225	A	Qo’ziqorinsimon so’rg’ich hid bilish retseptorlarida uchraydi	f
935	225	B	Tug’ma yaqinni ko’rish ko’z kosasini qisqa bo’lishi bilan bog’liq	f
936	225	C	egatsimon so’rg’ich tam bilish retseptori	t
937	225	D	Taktil so’rgich labirintlar ichida	f
938	226	A	14,17,20,27	t
939	226	B	1,11,23,21	f
940	226	C	5,7,8,19,28	f
941	226	D	3,9,15,20	f
942	227	A	I – fikr to’g’ri	f
943	227	B	II – fikr to’g’ri	t
945	227	D	I va II – fikr to’g’ri	f
946	228	A	Toza suvda H+ va OH- ionlarining konsentratsiyasi teng	f
947	228	B	Limon suvli eritmaga H+ ionlarini, sovun esa OH- ionlarini beradi	f
948	228	C	Bananlar olmaga qaraganda kislotaliroq	f
949	228	D	Qondagi H+ konsentratsiyasi sutdagi H+ konsentratsiyasidan past	f
950	228	E	pH qiymati 7 dan 14 gacha yaqinlashganda, suvli eritmalarning asosligi ortadi	t
951	229	A	Faqat I	f
952	229	B	I va III	f
953	229	C	Faqat III	f
954	229	D	II va III	t
955	230	A	1, 4, 5;	f
956	230	B	2, 3, 4;	f
957	230	C	1, 3, 5;	t
958	230	D	1, 2, 5	f
959	231	A	Miya ko’prigi – Bosh miyaning oldingi qismi	f
960	231	B	Orqa miya – O’rta miya	f
961	231	C	Gipotalamus – Miya ko’prigi	f
962	231	D	Miyacha – Gipotalamus	f
963	231	E	Orqa miya – Miyacha	t
964	232	A	toshbaqa va qurbaqa uchun birlashgan jag’lar umumiy jihat	f
965	232	B	levrak va toshbaqa uchun yuruvchi to’rt oyoqlar umumiy jihat	t
966	232	C	qurbaqa va leopard uchun birlashgan jag’lar umumiy jihat	f
967	232	D	leopard va toshbaqa uchun amnion parda umumiy jihat	f
968	233	A	Faqat 1 – fikr	f
969	233	B	Faqat 2 – fikr	t
970	233	C	Faqat 3 – fikr	f
971	233	D	I va III fikr to’g’ri	f
972	233	E	I,II va III fikr to’g’ri	f
973	234	A	13	f
974	234	B	24	f
975	234	C	12	t
976	234	D	22	f
977	235	A	Ixtiyoriy ishlaydi, tez qisqaradi va tez charchaydi	f
978	235	B	Hujayralarida kislorod saqlovchi mioglobin oqsili bor	f
979	235	C	Aktin va miozin iplari muskul bo'ylab tartibli joylashgan	f
980	235	D	Qisqarib - bo'shashishi avtonom (vegetativ) nerv sistemasi orqali boshqariladi	t
981	235	E	Kislorod yetishmaganda sut kislotali bijg'ishni amalga oshiradi.	f
982	236	A	tasvir	f
983	236	B	namoyish	t
984	236	C	tushuntirish	f
985	237	A	tushunish	f
986	237	B	qo`llash	t
987	237	C	bilish	f
988	237	D	tahlil qilish	f
989	238	A	tushunish	f
990	238	B	qo`llash	t
991	238	C	bilish	f
992	238	D	sintez	f
993	239	A	1,2,3	f
994	239	B	1,2,3,4	f
995	239	C	2,3,4	f
996	239	D	1,2,4	t
997	240	A	Oʻquvchilar tomonidan bilimlarni egallash darajasini (hajmini) muntazam / tizimli ravishda kuzatib borish	t
998	240	B	Oʻquvchilar erishgan yutuqlarni natijalarini tahlil qilish	f
999	240	C	Dars rejasi va usullarini moslashtirishda tahlil natijalaridan foydalanish	f
1000	240	D	Oʻquvchining yutuqlarini baholash, baho asoslab berish	f
1001	241	A	tinch yo`l bilan kelishish	f
1002	241	B	ogohlantirish	f
1003	241	C	suhbat asosida hal qilish	f
1004	241	D	o`zaro ajratish	t
1005	242	A	induksiya	f
1006	242	B	deduksiya	t
1007	242	C	analogiya	f
1008	243	A	induktiv metod	f
1009	243	B	analogiya	f
1010	243	C	amaliy metod	f
1011	243	D	deduktiv metod	t
1012	244	A	rahbar buyrug`I	t
1013	244	B	kuch bilan hal qilish	f
1014	244	C	sud qarori	f
1015	244	D	axloq komissiyasi	f
1016	245	A	noan’anaviy usul	f
1017	245	B	huquqiy-normativ asos	t
1018	245	C	intuitsiyaga tayangan holda	f
1019	245	D	emotsional yondashuv	f
1020	246	A	amaliy metod	t
1021	246	B	tasvir metodi	f
1022	246	C	namoyish metodi	f
1023	246	D	hikoya metodi	f
1024	247	A	o`zlashtirishni baholash va qayta aloqani taqdim etish	f
1025	247	B	ta’lim samaradorligini ta’minlash	f
1026	247	C	o`z-o`zini rivojlantirish va kasbiy o`sish	t
1027	247	D	xavfsiz rivojlantiruvchi ta’lim muhitini yaratish	f
1028	248	A	Boshqalarning darsiga kirib kasbiy mahoratini oshirishi	f
1029	248	B	O'z tajribalarini ish uslublaririni ommalashtirishi	t
1030	248	C	Ko'proq ochiq dars o'tishga tayyorlanish va ochiq dars o'tish	f
1031	248	D	Hamkasblar va mutaxasislar bilan dars o'tish haqida suhbatlashish	f
1032	249	A	tushuntirish usuli	t
1033	249	B	iltimos usuli	f
1034	249	C	talab usuli	f
1035	249	D	sud qarori usuli	f
1036	250	A	1,2,3	f
1037	250	B	1,3,4	t
1038	250	C	2,3,4	f
1039	250	D	1,2,3,4	f
1040	251	A	I – dreysena; II – qoraqurt; III – chuchuk suv gidrasi	t
1041	251	B	I - yalang’och shilliq; II – yomg’ir chuvalchang; III – qizil chuvalchang	f
1042	251	C	I – baqachanoq; II – kamchatka; III – bitiniya	f
1043	251	D	I – planariya; II – nereida; III – oddiy amyoba	f
1044	252	A	14,17,20,21	f
1045	252	B	1,11,22,23	f
1046	252	C	5,7,8,19,28	t
1047	252	D	3,9,15	f
1048	253	A	1 - tuxum; 2 - qoramol qonidagi lichinka	t
1049	253	B	1 - qoramol ichagidagi tuxum; 2 - qoramol qonidagi voyaga yetgan exinokokk	f
1050	253	C	1 - asosiy xo’jayin ichagidagi lichinka; 2 - qoramol qonidagi voyaga yetgan parazit	f
1051	253	D	1 - tuxum; 2 - it organizmida sista hosil qilayotgan lichinka	f
1052	254	A	1-baqachanoq; 2-dafniya; 3-krevetka	f
1053	254	B	1-apollon; 2-perlovitsa; 3-langust	t
1054	254	C	1-zorka; 2-yomg'ir chuvalchangi; 3-biy	f
1055	254	D	1-tovusko'z; 2-langust; 3-qoraqurt	f
1056	255	A	1,2,4	f
1057	255	B	1,3,4	f
1058	255	C	2,4,5	f
1059	255	D	1,3,5	t
1060	256	A	I – 3 – yarusni egallaydi hayotiy shakli buta; II – 1 – yarusni egallaydi hayotiy shakli daraxt; III – arxegoniyga ega	f
1061	256	B	I – 4 – yarusni egallaydi hayotiy shakli yarim buta; II – 1 – yarusni egallaydi hayotiy shakli daraxt; III – urug’kurtaka ega	f
1062	256	C	I – 4 – yarusni egallaydi hayotiy shakli yarim buta; II – 2 – yarusni egallaydi hayotiy shakli daraxt; III – urug’kurtaka ega	f
1063	256	D	I – 3 – yarusni egallaydi hayotiy shakli buta; II – 1 – yarusni egallaydi hayotiy shakli daraxt; III – chang donasi va o’tkazuvchi sistemaga ega	t
1064	258	A	I - Zamburug‘ hujayrasi qobig‘i va bo‘g‘imoyoqlilar tana qoplamiga mustahkamlik beradi; II - Murein bakteriya hujayrasi devori tarkibiga kiradi; III - Hayvonlarda qon ivishiga to‘sqinlik qiladi; IV – Plastik funksiyani bajaradi; V – Getropolimer hisoblanadi	f
1065	258	B	I - Xitin tarkibida azot saqlaydi; II - Murein bakteriya hujayrasi devori tarkibiga kiradi; III – Jigardan ishlab chiqariladi qon ivishiga to’sqinlik qiladi; IV – Plastik funksiyani bajaradi; V – Polisaxaridlar guruhiga mansub	t
1066	258	C	I - Zamburug‘ hujayrasi qobig‘i va bo‘g‘imoyoqlilar tana qoplamiga mustahkamlik beradi; II – Lishaynik hujayrasi devori tarkibiga kiradi; III - Hayvonlarda zaxira oziq modda sifatida to’planadi; IV - qurilish materiali hisoblanadi; V – monomeri glukoza hisoblanadi	f
1067	258	D	I - Xitin tarkibida azot saqlaydi; II – Murein sianobakteriyalar hujayrasi devori tarkibiga kiradi; III - Jigardan ishlab chiqariladi qon ivishiga to’sqinlik qiladi; IV - Himoya funksiyasini bajaradi: V – Gidrofob modda hisoblanadi	f
1068	259	A	Faqat III	f
1069	259	B	I va II	f
1070	259	C	I va III	f
1071	259	D	II va III	f
1072	259	E	I,II va III	t
1073	260	A	400	f
1074	260	B	600	f
1075	260	C	100	f
1076	260	D	200	t
1077	261	A	a-3,b-4,d-5,e-1,f-2.	t
1078	261	B	a-4,b-3,d-5,e-1,f-2.	f
1079	261	C	a-3,b-2,d-5,e-1,f-4.	f
1080	261	D	a-3,b-4,d-1,e-5,f-2.	f
1081	262	A	I ifodasi teri kapillarlarini ifodalaydi	f
1082	262	B	II ifodasi vena qon tomirlarini ifodalaydi	t
1083	262	C	III ifodasi yurak qorinchasini ifodalaydi	f
1084	262	D	II ifodasi yurak qorinchasini ifodalaydi	f
1085	263	A	a - 1, 3, 5; b-1, 3;	t
1086	263	B	a - 1, 5; b-1, 2, 3;	f
1087	263	C	a - 1, 2, 3; b-1, 3;	f
1088	263	D	a - 1, 3, 4; b-1, 2, 3;	f
1089	264	A	2, 3, 5	t
1090	264	B	1, 4, 6	f
1091	264	C	2, 4, 5	f
1092	264	D	1, 3 ,5	f
1093	265	A	1, 2, 4;	f
1094	265	B	2, 4, 6;	f
1095	265	C	3, 4, 6;	f
1096	265	D	2, 4, 5;	t
1097	266	A	1, 2, 4, 5	f
1098	266	B	1, 3, 5, 7	t
1099	266	C	3, 4, 6, 7	f
1100	266	D	3, 4, 5, 6	f
1101	267	A	I	f
1102	267	B	II	f
1103	267	C	III	f
1104	267	D	II va III	f
1105	267	E	I,II va III	t
1106	268	A	kaliy	f
1107	268	B	natriy	f
1108	268	C	oqsil	t
1109	268	D	aminokislotalar	f
1110	268	E	glyukoza	f
1111	269	A	faqat I	f
1112	269	B	faqat II	f
1113	269	C	faqat III	f
1114	269	D	I va II	t
1115	269	E	I, II va III	f
1116	270	A	Faqat I	f
1117	270	B	II va IV	f
1118	270	C	III va IV	f
1119	270	D	I va III	f
1120	270	E	I,II va III	t
1121	271	A	Jabralar orqali nafas oladi.	f
1122	271	B	Zararli azot mahsulotini ammiak ko’rinishida chiqaradi	f
1123	271	C	Uning yuragida doimo kislorodsiz qon bo'ladi.	f
1124	271	D	Uning tanasi suv o'tkazmaydigan tangachalar bilan qoplangan.	f
1125	271	E	Loviyasimon tana buyraklar orqali keraksiz moddalar chiqadi	t
1126	272	A	600	f
1127	272	B	1200	f
1128	272	C	1000	f
1129	272	D	800	t
1130	273	A	1,4,8	f
1131	273	B	2,4,8	t
1132	273	C	2,3,8	f
1133	273	D	2,4,6	f
1134	274	A	I va II	t
1135	274	B	I va III	f
1136	274	C	II va III	f
1137	274	D	I, II va IV	f
1138	274	E	III va IV	f
1139	275	A	I va II	t
1140	275	B	I va III	f
1141	275	C	II va III	f
1142	275	D	III va IV	f
1143	275	E	I,II va III	f
1144	276	A	Antitanacha Eritrotsit	f
1145	276	B	Albumin Karbonat angidraza fermenti	f
1146	276	C	Vitamin Eritrotsit	f
1147	276	D	Gemoglobin Nafas olish fermenti	t
1148	276	E	Garmon Karbonat angidraza fermenti	f
1149	277	A	Partenogenez orqali hosil bo'lgan barcha erkak arilarning genetik tuzilishi bir xildir	t
1150	277	B	Bitta erkak arining barcha spermatozoidlarining genetik tuzilishi bir xildir	f
1151	277	C	Erkak ari gametalarini (spermatozoidlarni) hosil qilayotganda tetrada hosil bo'lishi kuzatilmaydi	f
1152	277	D	Zigotaning gul changi bilan oziqlanishi natijasida hosil bo'lgan ishchi arilar ko'payish jarayonida qatnashmaydi	f
1153	277	E	Urug'lanish natijasida hosil bo'lgan barcha asalari urg'ochidir	f
1154	278	A	a – 2, 6; b – 1, 5	t
1155	278	B	a – 4, 5; b – 3, 6	f
1156	278	C	a – 2, 6; b – 3, 4	f
1157	278	D	a – 3, 5; b – 2, 4	f
1158	279	A	a-4,5; b-1,2,3;	f
1159	279	B	a-1,2,3,5; b-4;	f
1160	279	C	a-1,2,3,5; b-4;	f
1161	279	D	a-1,2,3; b-4,5;	t
1162	280	A	a2,b4,d1,e3	t
1163	280	B	a3,b4,d1,e2	f
1164	280	C	a2,b4,d3,e1	f
1165	280	D	a3,b1,d4,e2	f
1166	281	A	2,10;	f
1167	281	B	2,8;	f
1168	281	C	9,4;	f
1169	281	D	2,6;	t
1170	282	A	a-tireotoksikoz; b-tireotrop	t
1171	282	B	c-nanizm d-androgen	f
1172	282	C	e-qandli diabet a-tetaniya	f
1173	282	D	b-somatotrop d-estrogen	f
1174	283	A	Tigmotropizm	f
1175	283	B	Fotonastiya	f
1176	283	C	Fototropizm	f
1177	283	D	Fototaksis	t
1178	284	A	Faqat I	f
1179	284	B	Faqat II	f
1180	284	C	Faqat III	f
1181	284	D	II va III	t
1182	284	E	I,II va III	f
1183	285	A	3,5,2,4,1	f
1184	285	B	1,5,4,2,3	f
1185	285	C	1,3,4,5,2	f
1186	285	D	1,4,2,5,3	f
1187	286	A	ta’limni insonparvarlashtirishdagi to‘siqlarni yo‘qotishga imkon beradi. U ijtimoiy gumanitar va tabiiy-ilmiy bilimlarni birlashtirish, ketma-ketlikni o‘rnatish va fanlararo aloqalarni o‘quvchilarning idrok etishi va amaliy faoliyat metodologiyasining mohiyatini anglab еtishlariga tayanishni talab etadi.	f
1188	286	B	ta’lim mazmunini o‘sib boruvchi yo‘nalishda rejalashtirishdan iborat bo‘lishini anglatadi, bunda birinchi navbatda har bir yangi bilim avvalgisiga tayanadi va undan kelib chiqadi.	f
1189	286	C	o‘rganilayotgan bilimlar va shakllantirilayotgan malakalar va kompetentsiyalarni yagona tizimdagi o‘rni, umumiy o‘rta ta’ lim, barcha o‘quv kurslari va yaxlit mazmunning bir-biriga hamda umuminsoniy, milliy madaniyat tizimi aloqadorlikda ko‘rib chiqishni ko‘zda tutadi.	f
1190	286	D	1a,2b	f
1191	286	E	1b,2c	t
1192	287	A	tahlil	f
1193	287	B	sintez	f
1194	287	C	qo`llash	t
1195	287	D	amaliy	f
1196	288	A	Dars maqsadlari asosida oʻquvchilar uchun erishimli vazifalarni belgilash	f
1197	288	B	Dars mavzusiga mos keladigan namoyish va tarqatma materiallardan foydalanish	f
1198	288	C	Darsda vaqtdan oqilona foydalanish	t
1199	289	A	1,2,3	t
1200	289	B	1,2,4	f
1201	289	C	1,3,4	f
1202	289	D	1,2,3,4	f
1203	290	A	alohida hodisa va faktlardan umumiy qoidaga kelinadi.	f
1204	290	B	bu umumiy qoidalardan alohida holatlar uchun xulosa chiqarish usuli.	f
1205	290	C	bunda predmetlar ba'zi belgilarining o'xshashligi bo'yicha bu predmetlar boshqa belgilari bo'yicha ham o'xshash, degan taxminiy xulosa chiqariladi. "Xususiydan xususiyga boradigan", bir konkret faktdan boshqa konkret faktlarga boradigan xulosadir	f
1206	290	D	1a2b3c	t
1207	290	E	1c2a3b	f
1208	291	A	o`zlashtirishni baholash va qayta aloqani taqdim etish	f
1209	291	B	ta’lim samaradorligini ta’minlash	f
1210	291	C	o`z-o`zini rivojlantirish va kasbiy o`sish	f
1211	291	D	ta’limfaoliyatini tashkil etish	t
1212	292	A	o`zlashtirishni baholash va qayta aloqani taqdim etish	f
1213	292	B	ta’lim samaradorligini ta’minlash	f
1214	292	C	o`z-o`zini rivojlantirish va kasbiy o`sish	f
1215	292	D	xavfsiz rivojlantiruvchi ta’lim muhitini yaratish	t
1216	293	A	O'z tajribasini namoyish etish uchun ochiq darslarga tayyorgarlik ko'rish	f
1217	293	B	Doimiy ravishda fanga oid adabiyotlar bilan tanishib, yangi bilimlarni amaliyotda qo'llash	t
1218	293	C	O'zining ta'lim faoliyatini yetarlicha baholaydi va kasbiy rivojlanish ehtiyojlarini belgilay oladi	f
1219	293	D	Mustaqil ta'lim rejasini va uni amalga oshirgandan so'ng hisobotni tuzadi	f
1220	294	A	1,2,3	t
1221	294	B	2,3,4	f
1222	294	C	1,2,3,4	f
1223	294	D	1,3,4	f
1224	295	A	5,4,1,2	t
1225	295	B	3,2,1,4	f
1226	295	C	6,4,2,1	f
1227	295	D	1,2,4,5	f
1228	296	A	tushuntirish	f
1229	296	B	laborotoriya	t
1230	296	C	amaliy	f
1231	296	D	namoyish	f
1232	297	A	kooperativ refleksiya	f
1233	297	B	shaxsiy refleksiya	f
1234	297	C	intellectual refleksiya	t
1235	297	D	kasbiy refleksiya	f
1236	298	A	Dars maqsadlari asosida oʻquvchilar uchun erishimli vazifalarni belgilash	f
1237	298	B	Dars mavzusiga mos keladigan namoyish va tarqatma materiallardan foydalanish	f
1238	298	C	Oʻquvchilarning taʼlimiy maqsadlari va yosh xususiyatlariga mos keladigan oʻqitish usullari va yondashuvlarini tanlash	f
1239	298	D	Oʻqitishning faol usullaridan foydalanish (frontal taʼlim ustun boʻla olmaydi)	t
1240	299	A	suhbat	f
1241	299	B	tasvir	f
1242	299	C	didaktik o`yin	t
1243	299	D	amaliy	f
1244	300	A	suhbat	f
1245	300	B	amaliy	f
1246	300	C	mashq	t
1247	300	D	laborotoriya	f
\.


--
-- Data for Name: approvals; Type: TABLE DATA; Schema: public; Owner: biology_user
--

COPY public.approvals (id, approval_type, status, user_id, username, telegram_user_id, test_id, variant_number, request_message_id, requested_at, responded_at, resolved_by_telegram_id, consumed_at, notes, allowed_variants) FROM stdin;
337f2a5d-3b4a-4225-aa1a-fba3a96358f8	login	approved	11	asd	\N	\N	\N	47	2026-04-01 04:06:05.167556-05	2026-04-01 04:06:20.19075-05	8649349750	2026-04-01 04:06:22.008227-05	Login attempt	\N
f62246d2-37bb-4b64-ac0d-f5a5a05e92a3	login	approved	11	asd	\N	\N	\N	48	2026-04-01 04:11:19.906526-05	2026-04-01 04:11:24.28025-05	8649349750	2026-04-01 04:11:25.228079-05	Login attempt	\N
7ef99c7c-436b-480c-a29d-3047a4180a6c	exam_start	pending	11	asd	\N	2	1	49	2026-04-01 04:13:44.207336-05	\N	\N	\N	Exam attempt approval	\N
27727ca9-ab7c-47f5-bd49-22689ba0d5dc	exam_start	pending	11	asd	\N	2	5	68	2026-04-01 05:11:03.029955-05	\N	\N	\N	Exam attempt approval	\N
4d6fe12e-c3cf-4cc9-92a8-3f4ea5b611e0	exam_start	approved	11	asd	\N	2	1	50	2026-04-01 04:13:44.196307-05	2026-04-01 04:13:48.409232-05	8649349750	\N	Exam attempt approval	\N
83d2d4ab-d6f9-4572-9c4d-8bc00bd6e3be	exam_start	pending	11	asd	\N	2	1	51	2026-04-01 04:13:55.213276-05	\N	\N	\N	Exam attempt approval	\N
13657421-034a-4e1b-a8d0-206718f2d42c	exam_start	pending	11	asd	\N	4	5	79	2026-04-01 05:57:55.567639-05	\N	\N	\N	Exam attempt approval	\N
ea5c3929-aa4e-4967-9060-9a4eeb7bdd5d	exam_start	approved	11	asd	\N	2	1	52	2026-04-01 04:13:55.213727-05	2026-04-01 04:13:58.201251-05	8649349750	2026-04-01 04:13:58.331729-05	Exam attempt approval	\N
ffa15e7a-b0c7-46cd-bd91-b3124d82bd04	exam_start	rejected	11	asd	\N	2	5	69	2026-04-01 05:11:03.029155-05	2026-04-01 05:11:05.822664-05	8649349750	\N	Exam attempt approval	\N
4efba85b-defe-4937-a269-01319f4d7e86	exam_start	pending	11	asd	\N	2	1	54	2026-04-01 05:09:56.189359-05	\N	\N	\N	Exam attempt approval	\N
c8e67a92-b50d-4351-87bb-4a67b2ff498e	exam_start	pending	11	asd	\N	2	1	55	2026-04-01 05:09:56.167421-05	\N	\N	\N	Exam attempt approval	\N
19399cc8-2038-4e60-a227-c97fb84cad24	exam_start	pending	11	asd	\N	2	1	56	2026-04-01 05:09:56.91639-05	\N	\N	\N	Exam attempt approval	\N
ca73c4f7-f71d-4110-9851-14d4a0d6e9f8	exam_start	pending	11	asd	\N	2	1	57	2026-04-01 05:09:56.934503-05	\N	\N	\N	Exam attempt approval	\N
7a74be2d-05b0-43b7-a6de-6a02d42b1cab	exam_start	pending	11	asd	\N	2	1	59	2026-04-01 05:09:57.257086-05	\N	\N	\N	Exam attempt approval	\N
ff62a40a-95ea-43bd-bec0-e9d7b73b7da7	exam_start	pending	11	asd	\N	2	1	58	2026-04-01 05:09:57.24024-05	\N	\N	\N	Exam attempt approval	\N
1e847c29-ca60-49e4-bd15-d1e7e3be1629	exam_start	pending	11	asd	\N	2	1	60	2026-04-01 05:10:02.968697-05	\N	\N	\N	Exam attempt approval	\N
77f79c47-2caa-42c0-a5d9-22cf50263c87	exam_start	approved	11	asd	\N	2	1	61	2026-04-01 05:10:02.974969-05	2026-04-01 05:10:12.185801-05	8649349750	\N	Exam attempt approval	\N
fe2f2966-7d58-422e-9b14-7337e1e915fa	exam_start	pending	11	asd	\N	2	1	62	2026-04-01 05:10:24.616158-05	\N	\N	\N	Exam attempt approval	\N
002999ab-adec-4b30-b308-8259d767be2b	exam_start	approved	11	asd	\N	2	1	53	2026-04-01 04:22:41.713569-05	2026-04-01 05:10:36.81965-05	8649349750	\N	Exam attempt approval	\N
997e15ac-4f14-4024-ba60-9909034536ef	exam_start	approved	11	asd	\N	2	1	63	2026-04-01 05:10:24.618356-05	2026-04-01 05:10:38.923606-05	8649349750	\N	Exam attempt approval	\N
cd20630a-a76b-4b48-a214-5b3eb3b8dcaf	exam_start	pending	11	asd	\N	2	1	64	2026-04-01 05:10:42.137064-05	\N	\N	\N	Exam attempt approval	\N
2631eee1-01a3-41e9-b0bb-f5c899ef72e6	exam_start	approved	11	asd	\N	2	1	65	2026-04-01 05:10:42.135808-05	2026-04-01 05:10:44.767972-05	8649349750	\N	Exam attempt approval	\N
7a1072f9-384c-48e8-a198-b659d7a31e70	exam_start	pending	11	asd	\N	2	5	66	2026-04-01 05:10:52.996622-05	\N	\N	\N	Exam attempt approval	\N
f29da1a1-076d-4395-a75b-f535e64afaf2	login	approved	11	asd	\N	\N	\N	70	2026-04-01 05:55:02.055927-05	2026-04-01 05:55:27.216979-05	8649349750	2026-04-01 05:55:28.84668-05	Login attempt	\N
fff3b654-51dc-47e9-9c05-263dddd7e77e	exam_start	approved	11	asd	\N	2	5	67	2026-04-01 05:10:52.995901-05	2026-04-01 05:10:55.301104-05	8649349750	\N	Exam attempt approval	\N
38782083-e2b5-4af7-b796-dee3a85eeedb	exam_start	pending	11	asd	\N	4	1	71	2026-04-01 05:55:36.507321-05	\N	\N	\N	Exam attempt approval	\N
6dcb7f28-09e2-46ea-abbc-f48ef879bfea	exam_start	rejected	11	asd	\N	4	5	80	2026-04-01 05:57:55.568322-05	2026-04-01 05:58:00.316178-05	8649349750	\N	Exam attempt approval	\N
b8f5f5ed-68e3-4792-8395-41f3c56ae614	exam_start	approved	11	asd	\N	4	1	72	2026-04-01 05:55:36.507903-05	2026-04-01 05:55:40.300904-05	8649349750	\N	Exam attempt approval	\N
36a38bec-dec5-428c-8cfc-0e2377964e1d	exam_start	pending	11	asd	\N	4	1	73	2026-04-01 05:55:48.197433-05	\N	\N	\N	Exam attempt approval	\N
117985a2-aec8-4492-bf15-e4ed88a4a426	exam_start	approved	11	asd	\N	4	1	74	2026-04-01 05:55:48.196937-05	2026-04-01 05:55:51.688205-05	8649349750	\N	Exam attempt approval	\N
c10907cd-2312-4a5a-8a69-aafbbd6141d0	exam_start	pending	11	asd	\N	4	1	75	2026-04-01 05:56:01.92975-05	\N	\N	\N	Exam attempt approval	\N
df8ce7ee-2765-417d-98f9-feef5516d63b	exam_start	approved	11	asd	\N	4	1	76	2026-04-01 05:56:01.92735-05	2026-04-01 05:56:07.704006-05	8649349750	\N	Exam attempt approval	\N
818ef79d-4908-4d15-89c4-3af0d05e4b3b	exam_start	pending	11	asd	\N	2	1	77	2026-04-01 05:56:33.36421-05	\N	\N	\N	Exam attempt approval	\N
95cea2d3-2be4-4291-bf73-49b25ea1d594	exam_start	pending	11	asd	\N	4	5	81	2026-04-01 05:58:08.694928-05	\N	\N	\N	Exam attempt approval	\N
88d5f0c8-a9e0-4d54-8949-6cb36a760daa	exam_start	approved	11	asd	\N	2	1	78	2026-04-01 05:56:33.36374-05	2026-04-01 05:56:37.060816-05	8649349750	\N	Exam attempt approval	\N
0db91cd9-f35d-4422-9e99-2f73fe35a067	exam_start	approved	11	asd	\N	4	5	82	2026-04-01 05:58:08.694506-05	2026-04-01 05:58:11.439761-05	8649349750	2026-04-01 06:01:15.847437-05	Exam attempt approval	\N
2a681528-4c1a-439a-a0f7-9ea77880247f	login	approved	11	asd	\N	\N	\N	83	2026-04-01 06:06:25.447362-05	2026-04-01 06:06:30.987734-05	8649349750	2026-04-01 06:06:32.638756-05	Login attempt	\N
6e121db8-00a2-45bb-89a3-89f3d783e095	login	approved	11	asd	\N	\N	\N	85	2026-04-01 06:27:54.015971-05	2026-04-01 06:27:57.192201-05	8649349750	2026-04-01 06:27:57.713155-05	Login attempt	\N
e99c0146-c612-478b-a031-a7f441439cd0	login	approved	11	asd	\N	\N	\N	84	2026-04-01 06:20:37.596357-05	2026-04-01 06:20:44.394383-05	8649349750	2026-04-01 06:20:45.985146-05	Login attempt	\N
06306eb0-8279-41ed-b8d9-4f00256a1fce	login	pending	11	asd	\N	\N	\N	87	2026-04-01 08:01:39.238246-05	\N	\N	\N	Login attempt	\N
91c8ba4d-e5b6-4a4a-a8cd-9294f6814e37	login	approved	11	asd	\N	\N	\N	89	2026-04-01 08:16:41.919166-05	2026-04-01 08:17:09.305024-05	8649349750	2026-04-01 08:17:11.640042-05	Login attempt	{3}
5527c960-39c1-4eaa-a04d-6b46e6fb0915	login	approved	11	asd	\N	\N	\N	88	2026-04-01 08:08:01.9461-05	2026-04-01 08:12:49.051814-05	8649349750	2026-04-01 08:12:49.714003-05	Login attempt	{2}
dc4cae9b-66a2-492b-bb83-9d4d07b8d7b0	login	approved	11	asd	\N	\N	\N	90	2026-04-01 08:30:55.261075-05	2026-04-01 08:31:00.837108-05	8649349750	2026-04-01 08:31:01.710449-05	Login attempt	{1,2,3,4,5}
5dd36342-11ab-455a-9f33-a573be7bfdd1	login	approved	11	asd	\N	\N	\N	91	2026-04-01 09:23:52.898254-05	2026-04-01 09:30:16.544334-05	8649349750	2026-04-01 09:34:14.721228-05	Login attempt	{3,4}
4ee4ca9c-2b82-49f8-bce8-ae8d87327456	login	approved	11	asd	\N	\N	\N	95	2026-04-01 09:35:16.950008-05	2026-04-01 09:35:34.934399-05	8649349750	2026-04-01 09:35:36.710513-05	Login attempt	{2,5}
29500fbb-fd57-4213-945f-e0d20954aa6c	login	approved	11	asd	\N	\N	\N	94	2026-04-01 09:34:21.813934-05	2026-04-01 09:34:42.399173-05	8649349750	2026-04-01 09:34:44.712021-05	Login attempt	{3}
ec9bf371-768b-4c59-8566-419626020933	login	approved	42	Asadbek_sayidahmadov	\N	\N	\N	103	2026-04-01 10:14:58.38045-05	2026-04-01 10:16:22.272426-05	5316935608	2026-04-01 10:16:22.702334-05	Login attempt	{1}
\.


--
-- Data for Name: attempt_answers; Type: TABLE DATA; Schema: public; Owner: biology_user
--

COPY public.attempt_answers (id, attempt_id, question_id, selected_option) FROM stdin;
2	2	107	E
3	2	115	D
4	2	133	E
5	2	48	C
6	2	141	D
7	2	246	D
8	2	100	D
9	2	242	D
10	2	219	C
11	2	167	D
12	2	169	D
13	2	114	D
14	2	162	D
15	2	37	D
16	2	251	C
17	2	65	D
18	2	122	C
19	2	33	D
20	2	236	D
21	2	283	D
22	2	39	D
23	2	106	D
24	2	41	D
25	2	189	D
26	2	22	D
27	2	44	D
28	2	253	D
29	2	72	E
30	2	184	D
31	2	146	D
32	2	101	E
33	2	118	E
34	2	171	D
35	2	132	D
36	2	261	D
37	2	221	D
38	2	117	E
39	2	26	D
40	2	222	D
41	2	142	D
42	2	60	D
1	2	288	D
43	2	262	D
44	2	90	D
45	2	244	D
46	2	170	D
47	2	70	D
48	2	102	D
49	2	193	D
50	2	199	D
51	9	231	C
52	9	63	B
53	9	154	D
54	9	297	D
55	9	204	C
56	9	222	D
57	9	100	D
58	9	187	D
59	9	244	D
\.


--
-- Data for Name: attempt_questions; Type: TABLE DATA; Schema: public; Owner: biology_user
--

COPY public.attempt_questions (id, attempt_id, question_id, order_index) FROM stdin;
1	2	167	1
2	2	115	2
3	2	133	3
4	2	48	4
5	2	169	5
6	2	141	6
7	2	246	7
8	2	114	8
9	2	162	9
10	2	100	10
11	2	242	11
12	2	219	12
13	2	37	13
14	2	251	14
15	2	65	15
16	2	122	16
17	2	33	17
18	2	236	18
19	2	283	19
20	2	39	20
21	2	106	21
22	2	41	22
23	2	189	23
24	2	22	24
25	2	44	25
26	2	253	26
27	2	107	27
28	2	72	28
29	2	184	29
30	2	146	30
31	2	101	31
32	2	118	32
33	2	171	33
34	2	132	34
35	2	261	35
36	2	221	36
37	2	117	37
38	2	26	38
39	2	222	39
40	2	142	40
41	2	60	41
42	2	288	42
43	2	262	43
44	2	90	44
45	2	244	45
46	2	170	46
47	2	70	47
48	2	102	48
49	2	193	49
50	2	199	50
51	3	237	1
52	3	80	2
53	3	221	3
54	3	33	4
55	3	66	5
56	3	152	6
57	3	119	7
58	3	230	8
59	3	164	9
60	3	177	10
61	3	139	11
62	3	171	12
63	3	89	13
64	3	240	14
65	3	6	15
66	3	58	16
67	3	14	17
68	3	155	18
69	3	250	19
70	3	147	20
71	3	217	21
72	3	55	22
73	3	175	23
74	3	87	24
75	3	281	25
76	3	195	26
77	3	186	27
78	3	242	28
79	3	29	29
80	3	203	30
81	3	85	31
82	3	48	32
83	3	27	33
84	3	128	34
85	3	251	35
86	3	5	36
87	3	130	37
88	3	148	38
89	3	95	39
90	3	192	40
91	3	172	41
92	3	286	42
93	3	72	43
94	3	153	44
95	3	170	45
96	3	226	46
97	3	156	47
98	3	218	48
99	3	190	49
100	3	61	50
101	4	63	1
102	4	239	2
103	4	79	3
104	4	75	4
105	4	42	5
106	4	214	6
107	4	129	7
108	4	220	8
109	4	125	9
110	4	224	10
111	4	113	11
112	4	98	12
113	4	27	13
114	4	105	14
115	4	289	15
116	4	68	16
117	4	123	17
118	4	128	18
119	4	148	19
120	4	104	20
121	4	174	21
122	4	29	22
123	4	158	23
124	4	134	24
125	4	56	25
126	4	16	26
127	4	213	27
128	4	137	28
129	4	227	29
130	4	295	30
131	4	119	31
132	4	82	32
133	4	232	33
134	4	156	34
135	4	74	35
136	4	204	36
137	4	165	37
138	4	252	38
139	4	173	39
140	4	124	40
141	4	161	41
142	4	255	42
143	4	116	43
144	4	211	44
145	4	77	45
146	4	291	46
147	4	10	47
148	4	21	48
149	4	195	49
150	4	97	50
151	5	63	1
152	5	239	2
153	5	79	3
154	5	75	4
155	5	42	5
156	5	214	6
157	5	129	7
158	5	220	8
159	5	125	9
160	5	224	10
161	5	113	11
162	5	98	12
163	5	27	13
164	5	105	14
165	5	289	15
166	5	68	16
167	5	123	17
168	5	128	18
169	5	148	19
170	5	104	20
171	5	174	21
172	5	29	22
173	5	158	23
174	5	134	24
175	5	56	25
176	5	16	26
177	5	213	27
178	5	137	28
179	5	227	29
180	5	295	30
181	5	119	31
182	5	82	32
183	5	232	33
184	5	156	34
185	5	74	35
186	5	204	36
187	5	165	37
188	5	252	38
189	5	173	39
190	5	124	40
191	5	161	41
192	5	255	42
193	5	116	43
194	5	211	44
195	5	77	45
196	5	291	46
197	5	10	47
198	5	21	48
199	5	195	49
200	5	97	50
201	6	76	1
202	6	4	2
203	6	85	3
204	6	210	4
205	6	212	5
206	6	67	6
207	6	50	7
208	6	53	8
209	6	223	9
210	6	40	10
211	6	299	11
212	6	46	12
213	6	155	13
214	6	229	14
215	6	269	15
216	6	266	16
217	6	78	17
218	6	276	18
219	6	5	19
220	6	15	20
221	6	285	21
222	6	293	22
223	6	258	23
224	6	59	24
225	6	13	25
226	6	164	26
227	6	12	27
228	6	150	28
229	6	159	29
230	6	282	30
231	6	139	31
232	6	62	32
233	6	143	33
234	6	192	34
235	6	265	35
236	6	38	36
237	6	92	37
238	6	140	38
239	6	131	39
240	6	153	40
241	6	274	41
242	6	110	42
243	6	19	43
244	6	147	44
245	6	275	45
246	6	182	46
247	6	286	47
248	6	35	48
249	6	96	49
250	6	73	50
251	7	76	1
252	7	4	2
253	7	85	3
254	7	210	4
255	7	212	5
256	7	67	6
257	7	50	7
258	7	53	8
259	7	223	9
260	7	40	10
261	7	299	11
262	7	46	12
263	7	155	13
264	7	229	14
265	7	269	15
266	7	266	16
267	7	78	17
268	7	276	18
269	7	5	19
270	7	15	20
271	7	285	21
272	7	293	22
273	7	258	23
274	7	59	24
275	7	13	25
276	7	164	26
277	7	12	27
278	7	150	28
279	7	159	29
280	7	282	30
281	7	139	31
282	7	62	32
283	7	143	33
284	7	192	34
285	7	265	35
286	7	38	36
287	7	92	37
288	7	140	38
289	7	131	39
290	7	153	40
291	7	274	41
292	7	110	42
293	7	19	43
294	7	147	44
295	7	275	45
296	7	182	46
297	7	286	47
298	7	35	48
299	7	96	49
300	7	73	50
301	8	228	1
302	8	254	2
303	8	183	3
304	8	278	4
305	8	70	5
306	8	109	6
307	8	99	7
308	8	54	8
309	8	39	9
310	8	42	10
311	8	267	11
312	8	246	12
313	8	104	13
314	8	115	14
315	8	198	15
316	8	142	16
317	8	165	17
318	8	79	18
319	8	13	19
320	8	45	20
321	8	174	21
322	8	274	22
323	8	300	23
324	8	210	24
325	8	272	25
326	8	159	26
327	8	193	27
328	8	28	28
329	8	277	29
330	8	137	30
331	8	81	31
332	8	46	32
333	8	231	33
334	8	63	34
335	8	154	35
336	8	297	36
337	8	204	37
338	8	222	38
339	8	100	39
340	8	187	40
341	8	244	41
342	8	233	42
343	8	299	43
344	8	112	44
345	8	200	45
346	8	90	46
347	8	118	47
348	8	219	48
349	8	247	49
350	8	235	50
351	9	228	1
352	9	254	2
353	9	183	3
354	9	278	4
355	9	70	5
356	9	109	6
357	9	99	7
358	9	54	8
359	9	39	9
360	9	42	10
361	9	267	11
362	9	246	12
363	9	104	13
364	9	115	14
365	9	198	15
366	9	142	16
367	9	165	17
368	9	79	18
369	9	13	19
370	9	45	20
371	9	174	21
372	9	274	22
373	9	300	23
374	9	210	24
375	9	272	25
376	9	159	26
377	9	193	27
378	9	28	28
379	9	277	29
380	9	137	30
381	9	81	31
382	9	46	32
383	9	231	33
384	9	63	34
385	9	154	35
386	9	297	36
387	9	204	37
388	9	222	38
389	9	100	39
390	9	187	40
391	9	244	41
392	9	233	42
393	9	299	43
394	9	112	44
395	9	200	45
396	9	90	46
397	9	118	47
398	9	219	48
399	9	247	49
400	9	235	50
401	10	63	1
402	10	239	2
403	10	79	3
404	10	75	4
405	10	42	5
406	10	214	6
407	10	129	7
408	10	220	8
409	10	125	9
410	10	224	10
411	10	113	11
412	10	98	12
413	10	27	13
414	10	105	14
415	10	289	15
416	10	68	16
417	10	123	17
418	10	128	18
419	10	148	19
420	10	104	20
421	10	174	21
422	10	29	22
423	10	158	23
424	10	134	24
425	10	56	25
426	10	16	26
427	10	213	27
428	10	137	28
429	10	227	29
430	10	295	30
431	10	119	31
432	10	82	32
433	10	232	33
434	10	156	34
435	10	74	35
436	10	204	36
437	10	165	37
438	10	252	38
439	10	173	39
440	10	124	40
441	10	161	41
442	10	255	42
443	10	116	43
444	10	211	44
445	10	77	45
446	10	291	46
447	10	10	47
448	10	21	48
449	10	195	49
450	10	97	50
451	11	63	1
452	11	239	2
453	11	79	3
454	11	75	4
455	11	42	5
456	11	214	6
457	11	129	7
458	11	220	8
459	11	125	9
460	11	224	10
461	11	113	11
462	11	98	12
463	11	27	13
464	11	105	14
465	11	289	15
466	11	68	16
467	11	123	17
468	11	128	18
469	11	148	19
470	11	104	20
471	11	174	21
472	11	29	22
473	11	158	23
474	11	134	24
475	11	56	25
476	11	16	26
477	11	213	27
478	11	137	28
479	11	227	29
480	11	295	30
481	11	119	31
482	11	82	32
483	11	232	33
484	11	156	34
485	11	74	35
486	11	204	36
487	11	165	37
488	11	252	38
489	11	173	39
490	11	124	40
491	11	161	41
492	11	255	42
493	11	116	43
494	11	211	44
495	11	77	45
496	11	291	46
497	11	10	47
498	11	21	48
499	11	195	49
500	11	97	50
501	12	167	1
502	12	115	2
503	12	133	3
504	12	48	4
505	12	169	5
506	12	141	6
507	12	246	7
508	12	114	8
509	12	162	9
510	12	100	10
511	12	242	11
512	12	219	12
513	12	37	13
514	12	251	14
515	12	65	15
516	12	122	16
517	12	33	17
518	12	236	18
519	12	283	19
520	12	39	20
521	12	106	21
522	12	41	22
523	12	189	23
524	12	22	24
525	12	44	25
526	12	253	26
527	12	107	27
528	12	72	28
529	12	184	29
530	12	146	30
531	12	101	31
532	12	118	32
533	12	171	33
534	12	132	34
535	12	261	35
536	12	221	36
537	12	117	37
538	12	26	38
539	12	222	39
540	12	142	40
541	12	60	41
542	12	288	42
543	12	262	43
544	12	90	44
545	12	244	45
546	12	170	46
547	12	70	47
548	12	102	48
549	12	193	49
550	12	199	50
551	13	167	1
552	13	115	2
553	13	133	3
554	13	48	4
555	13	169	5
556	13	141	6
557	13	246	7
558	13	114	8
559	13	162	9
560	13	100	10
561	13	242	11
562	13	219	12
563	13	37	13
564	13	251	14
565	13	65	15
566	13	122	16
567	13	33	17
568	13	236	18
569	13	283	19
570	13	39	20
571	13	106	21
572	13	41	22
573	13	189	23
574	13	22	24
575	13	44	25
576	13	253	26
577	13	107	27
578	13	72	28
579	13	184	29
580	13	146	30
581	13	101	31
582	13	118	32
583	13	171	33
584	13	132	34
585	13	261	35
586	13	221	36
587	13	117	37
588	13	26	38
589	13	222	39
590	13	142	40
591	13	60	41
592	13	288	42
593	13	262	43
594	13	90	44
595	13	244	45
596	13	170	46
597	13	70	47
598	13	102	48
599	13	193	49
600	13	199	50
601	14	76	1
602	14	4	2
603	14	85	3
604	14	210	4
605	14	212	5
606	14	67	6
607	14	50	7
608	14	53	8
609	14	223	9
610	14	40	10
611	14	299	11
612	14	46	12
613	14	155	13
614	14	229	14
615	14	269	15
616	14	266	16
617	14	78	17
618	14	276	18
619	14	5	19
620	14	15	20
621	14	285	21
622	14	293	22
623	14	258	23
624	14	59	24
625	14	13	25
626	14	164	26
627	14	12	27
628	14	150	28
629	14	159	29
630	14	282	30
631	14	139	31
632	14	62	32
633	14	143	33
634	14	192	34
635	14	265	35
636	14	38	36
637	14	92	37
638	14	140	38
639	14	131	39
640	14	153	40
641	14	274	41
642	14	110	42
643	14	19	43
644	14	147	44
645	14	275	45
646	14	182	46
647	14	286	47
648	14	35	48
649	14	96	49
650	14	73	50
651	15	76	1
652	15	4	2
653	15	85	3
654	15	210	4
655	15	212	5
656	15	67	6
657	15	50	7
658	15	53	8
659	15	223	9
660	15	40	10
661	15	299	11
662	15	46	12
663	15	155	13
664	15	229	14
665	15	269	15
666	15	266	16
667	15	78	17
668	15	276	18
669	15	5	19
670	15	15	20
671	15	285	21
672	15	293	22
673	15	258	23
674	15	59	24
675	15	13	25
676	15	164	26
677	15	12	27
678	15	150	28
679	15	159	29
680	15	282	30
681	15	139	31
682	15	62	32
683	15	143	33
684	15	192	34
685	15	265	35
686	15	38	36
687	15	92	37
688	15	140	38
689	15	131	39
690	15	153	40
691	15	274	41
692	15	110	42
693	15	19	43
694	15	147	44
695	15	275	45
696	15	182	46
697	15	286	47
698	15	35	48
699	15	96	49
700	15	73	50
701	16	237	1
702	16	80	2
703	16	221	3
704	16	33	4
705	16	66	5
706	16	152	6
707	16	119	7
708	16	230	8
709	16	164	9
710	16	177	10
711	16	139	11
712	16	171	12
713	16	89	13
714	16	240	14
715	16	6	15
716	16	58	16
717	16	14	17
718	16	155	18
719	16	250	19
720	16	147	20
721	16	217	21
722	16	55	22
723	16	175	23
724	16	87	24
725	16	281	25
726	16	195	26
727	16	186	27
728	16	242	28
729	16	29	29
730	16	203	30
731	16	85	31
732	16	48	32
733	16	27	33
734	16	128	34
735	16	251	35
736	16	5	36
737	16	130	37
738	16	148	38
739	16	95	39
740	16	192	40
741	16	172	41
742	16	286	42
743	16	72	43
744	16	153	44
745	16	170	45
746	16	226	46
747	16	156	47
748	16	218	48
749	16	190	49
750	16	61	50
751	17	237	1
752	17	80	2
753	17	221	3
754	17	33	4
755	17	66	5
756	17	152	6
757	17	119	7
758	17	230	8
759	17	164	9
760	17	177	10
761	17	139	11
762	17	171	12
763	17	89	13
764	17	240	14
765	17	6	15
766	17	58	16
767	17	14	17
768	17	155	18
769	17	250	19
770	17	147	20
771	17	217	21
772	17	55	22
773	17	175	23
774	17	87	24
775	17	281	25
776	17	195	26
777	17	186	27
778	17	242	28
779	17	29	29
780	17	203	30
781	17	85	31
782	17	48	32
783	17	27	33
784	17	128	34
785	17	251	35
786	17	5	36
787	17	130	37
788	17	148	38
789	17	95	39
790	17	192	40
791	17	172	41
792	17	286	42
793	17	72	43
794	17	153	44
795	17	170	45
796	17	226	46
797	17	156	47
798	17	218	48
799	17	190	49
800	17	61	50
801	18	52	1
802	18	24	2
803	18	58	3
804	18	259	4
805	18	290	5
806	18	1	6
807	18	279	7
808	18	94	8
809	18	47	9
810	18	201	10
811	18	268	11
812	18	109	12
813	18	25	13
814	18	271	14
815	18	281	15
816	18	14	16
817	18	257	17
818	18	6	18
819	18	218	19
820	18	87	20
821	18	103	21
822	18	157	22
823	18	154	23
824	18	18	24
825	18	7	25
826	18	54	26
827	18	225	27
828	18	99	28
829	18	267	29
830	18	188	30
831	18	34	31
832	18	152	32
833	18	277	33
834	18	108	34
835	18	202	35
836	18	20	36
837	18	45	37
838	18	272	38
839	18	177	39
840	18	80	40
841	18	178	41
842	18	296	42
843	18	287	43
844	18	89	44
845	18	217	45
846	18	205	46
847	18	198	47
848	18	245	48
849	18	231	49
850	18	280	50
851	19	52	1
852	19	24	2
853	19	58	3
854	19	259	4
855	19	290	5
856	19	1	6
857	19	279	7
858	19	94	8
859	19	47	9
860	19	201	10
861	19	268	11
862	19	109	12
863	19	25	13
864	19	271	14
865	19	281	15
866	19	14	16
867	19	257	17
868	19	6	18
869	19	218	19
870	19	87	20
871	19	103	21
872	19	157	22
873	19	154	23
874	19	18	24
875	19	7	25
876	19	54	26
877	19	225	27
878	19	99	28
879	19	267	29
880	19	188	30
881	19	34	31
882	19	152	32
883	19	277	33
884	19	108	34
885	19	202	35
886	19	20	36
887	19	45	37
888	19	272	38
889	19	177	39
890	19	80	40
891	19	178	41
892	19	296	42
893	19	287	43
894	19	89	44
895	19	217	45
896	19	205	46
897	19	198	47
898	19	245	48
899	19	231	49
900	19	280	50
\.


--
-- Data for Name: attempts; Type: TABLE DATA; Schema: public; Owner: biology_user
--

COPY public.attempts (id, user_id, test_id, started_at, expires_at, submitted_at, score, total_questions, is_submitted, exam_signature, variant_index) FROM stdin;
10	11	4	2026-04-01 08:17:23.497414-05	2026-04-01 10:17:23.497033-05	2026-04-01 09:35:00.705338-05	0	50	t	63,239,79,75,42,214,129,220,125,224,113,98,27,105,289,68,123,128,148,104,174,29,158,134,56,16,213,137,227,295,119,82,232,156,74,204,165,252,173,124,161,255,116,211,77,291,10,21,195,97	3
1	11	2	2026-04-01 04:13:58.330404-05	2026-04-01 06:13:58.329728-05	2026-04-01 06:20:47.779458-05	0	50	t	45,99,185,124,122,168,10,177,198,114,4,52,16,90,210,86,116,22,104,106,201,244,62,30,127,223,73,46,175,214,105,96,67,165,249,200,79,80,13,197,150,28,82,100,235,11,134,125,43,224	1
2	11	4	2026-04-01 06:01:15.845235-05	2026-04-01 08:01:15.844277-05	2026-04-01 06:55:38.804828-05	22	50	t	167,115,133,48,169,141,246,114,162,100,242,219,37,251,65,122,33,236,283,39,106,41,189,22,44,253,107,72,184,146,101,118,171,132,261,221,117,26,222,142,60,288,262,90,244,170,70,102,193,199	5
5	11	4	2026-04-01 06:57:14.699646-05	2026-04-01 08:57:14.699398-05	2026-04-01 08:16:31.255714-05	0	50	t	63,239,79,75,42,214,129,220,125,224,113,98,27,105,289,68,123,128,148,104,174,29,158,134,56,16,213,137,227,295,119,82,232,156,74,204,165,252,173,124,161,255,116,211,77,291,10,21,195,97	3
11	11	4	2026-04-01 08:17:23.503892-05	2026-04-01 10:17:23.503542-05	2026-04-01 09:35:42.825017-05	0	50	t	63,239,79,75,42,214,129,220,125,224,113,98,27,105,289,68,123,128,148,104,174,29,158,134,56,16,213,137,227,295,119,82,232,156,74,204,165,252,173,124,161,255,116,211,77,291,10,21,195,97	3
4	11	4	2026-04-01 06:57:14.69854-05	2026-04-01 08:57:14.697917-05	2026-04-01 08:16:31.280215-05	0	50	t	63,239,79,75,42,214,129,220,125,224,113,98,27,105,289,68,123,128,148,104,174,29,158,134,56,16,213,137,227,295,119,82,232,156,74,204,165,252,173,124,161,255,116,211,77,291,10,21,195,97	3
3	11	2	2026-04-01 06:20:47.866599-05	2026-04-01 08:20:47.865796-05	2026-04-01 08:17:16.289709-05	0	50	t	237,80,221,33,66,152,119,230,164,177,139,171,89,240,6,58,14,155,250,147,217,55,175,87,281,195,186,242,29,203,85,48,27,128,251,5,130,148,95,192,172,286,72,153,170,226,156,218,190,61	1
9	11	2	2026-04-01 08:17:16.329444-05	2026-04-01 10:17:16.328953-05	\N	0	50	f	228,254,183,278,70,109,99,54,39,42,267,246,104,115,198,142,165,79,13,45,174,274,300,210,272,159,193,28,277,137,81,46,231,63,154,297,204,222,100,187,244,233,299,112,200,90,118,219,247,235	3
7	11	4	2026-04-01 08:16:31.315337-05	2026-04-01 10:16:31.315022-05	2026-04-01 08:17:23.461245-05	0	50	t	76,4,85,210,212,67,50,53,223,40,299,46,155,229,269,266,78,276,5,15,285,293,258,59,13,164,12,150,159,282,139,62,143,192,265,38,92,140,131,153,274,110,19,147,275,182,286,35,96,73	2
6	11	4	2026-04-01 08:16:31.308717-05	2026-04-01 10:16:31.307502-05	2026-04-01 08:17:23.48175-05	0	50	t	76,4,85,210,212,67,50,53,223,40,299,46,155,229,269,266,78,276,5,15,285,293,258,59,13,164,12,150,159,282,139,62,143,192,265,38,92,140,131,153,274,110,19,147,275,182,286,35,96,73	2
13	11	4	2026-04-01 09:35:42.855551-05	2026-04-01 11:35:42.855165-05	2026-04-01 09:35:44.703592-05	0	50	t	167,115,133,48,169,141,246,114,162,100,242,219,37,251,65,122,33,236,283,39,106,41,189,22,44,253,107,72,184,146,101,118,171,132,261,221,117,26,222,142,60,288,262,90,244,170,70,102,193,199	5
8	11	2	2026-04-01 08:17:16.317401-05	2026-04-01 10:17:16.316885-05	2026-04-01 08:17:33.27866-05	0	50	t	228,254,183,278,70,109,99,54,39,42,267,246,104,115,198,142,165,79,13,45,174,274,300,210,272,159,193,28,277,137,81,46,231,63,154,297,204,222,100,187,244,233,299,112,200,90,118,219,247,235	3
12	11	4	2026-04-01 09:35:42.846835-05	2026-04-01 11:35:42.846005-05	2026-04-01 09:35:44.726095-05	0	50	t	167,115,133,48,169,141,246,114,162,100,242,219,37,251,65,122,33,236,283,39,106,41,189,22,44,253,107,72,184,146,101,118,171,132,261,221,117,26,222,142,60,288,262,90,244,170,70,102,193,199	5
14	11	4	2026-04-01 09:35:44.743287-05	2026-04-01 11:35:44.742935-05	\N	0	50	f	76,4,85,210,212,67,50,53,223,40,299,46,155,229,269,266,78,276,5,15,285,293,258,59,13,164,12,150,159,282,139,62,143,192,265,38,92,140,131,153,274,110,19,147,275,182,286,35,96,73	2
15	11	4	2026-04-01 09:35:44.751103-05	2026-04-01 11:35:44.750782-05	\N	0	50	f	76,4,85,210,212,67,50,53,223,40,299,46,155,229,269,266,78,276,5,15,285,293,258,59,13,164,12,150,159,282,139,62,143,192,265,38,92,140,131,153,274,110,19,147,275,182,286,35,96,73	2
16	42	2	2026-04-01 10:17:03.41613-05	2026-04-01 12:17:03.415103-05	\N	0	50	f	237,80,221,33,66,152,119,230,164,177,139,171,89,240,6,58,14,155,250,147,217,55,175,87,281,195,186,242,29,203,85,48,27,128,251,5,130,148,95,192,172,286,72,153,170,226,156,218,190,61	1
17	42	2	2026-04-01 10:17:03.417715-05	2026-04-01 12:17:03.417342-05	\N	0	50	f	237,80,221,33,66,152,119,230,164,177,139,171,89,240,6,58,14,155,250,147,217,55,175,87,281,195,186,242,29,203,85,48,27,128,251,5,130,148,95,192,172,286,72,153,170,226,156,218,190,61	1
18	42	4	2026-04-01 10:19:26.445917-05	2026-04-01 12:19:26.44552-05	\N	0	50	f	52,24,58,259,290,1,279,94,47,201,268,109,25,271,281,14,257,6,218,87,103,157,154,18,7,54,225,99,267,188,34,152,277,108,202,20,45,272,177,80,178,296,287,89,217,205,198,245,231,280	1
19	42	4	2026-04-01 10:19:26.447315-05	2026-04-01 12:19:26.447023-05	\N	0	50	f	52,24,58,259,290,1,279,94,47,201,268,109,25,271,281,14,257,6,218,87,103,157,154,18,7,54,225,99,267,188,34,152,277,108,202,20,45,272,177,80,178,296,287,89,217,205,198,245,231,280	1
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: biology_user
--

COPY public.questions (id, test_id, order_index, prompt, option_a, option_b, option_c, option_d, correct_option, explanation, image_path, option_e, is_image_required, table_html) FROM stdin;
1	4	1	Quyida hujayrada sodir bo'ladigan ikkita metabolik jarayon sxematik ravishda ko'rsatilgan. Shunga ko'ra, K va L metabolik jarayonlari haqidagi qaysi fikrlar to’g’ri: I. K jarayoni katabolik, L jarayoni anabolik jarayondir; II. Har ikkala jarayonda ham foydalaniladigan fermentlar bir xildir; III. K jarayoni osmotik bosimni kamaytirsa, L jarayoni oshiradi.	Faqat I	Faqat II	Faqat III	I va III	A		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-01-media-01.png	I,II va III	t	\N
2	4	2	Quyida spermatogenez jarayoni sxematik ravishda ko'rsatilgan. a, b, c va d harflari bilan ko'rsatilgan hodisalar quyidagilarning qaysi birida to'g'ri berilgan? (a) (b) (c) (d)	Replikatsiya — Meyoz I — Meyoz II — Differensiyalanish	Replikatsiya — Mitoz — Meyoz II — Differensiyalanish	Duplikatsiya — Meyoz II — Meyoz I — Differensiyalanish	Replikatsiya — Meyoz I — Mitoz — Differensiyalanish	A		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-02-media-01.png	Transkripsiya — Meyoz I — Meyoz II — Mitoz	t	\N
3	4	3	Gulli o‘simliklarning sistematik guruhlari ko‘rsatilgan sxemani tahlil qilib, undagi “Turkum 1”ni aniqlang	sorgo	jo’xori	makkajo’xori	qo’ng’ribosh	B		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-03-media-01.png		t	\N
4	4	4	Quyidagi rasmda bakteriofag virusi ishtirokida o’tkazilgan tajriba tasvirlangan.? Bunga ko'ra, ushbu tajribaning maqsadi quyidagilardan qaysi biri?	Irsiyat molekulasi nima ekanligini aniqlash	DNKning replikatsiya mexanizmini tushuntirish	RNK molekulasining ahamiyatini aniqlash	Bakteriofagning ko'payish siklini tushuntirish	A		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-04-media-01.png		t	\N
5	4	5	Quyida nafas olishning gomeostatik nazorati ko'rsatilgan. Quyidagi fikrlardan qaysilari To’g’ri (T) va Noto’g’ri (N) aniqlang.? I. Qondagi karbonat angidrid miqdori bilan nafas olish tezligi o'rtasida teskari mutanosiblik bor; II. Uzunchoq miya qondagi karbonat angidrid miqdori ortganini faqat uyqu arteriyalari orqali sezadi; III. Uzunchoq miya nafas olishni oshirish uchun diafragma mushagiga faqat somatic nervlar bilan ogohlantiruvchi signallar yuboradi.	T,N,T	T,T,T	N,T,N	N,N,N	D		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-05-media-01.png		t	\N
6	4	6	Ushbu grafikdan F ga tegishli fikrlarni aniqlang 1)birlamchi konsument 2)yirtqich 3)o'tloq tipdagi oziq zanjirida ishtirok etadi 4)detrit tipdagi oziq zanjirida ishtirok etadi 5)ikkilamchi konsumentlar tomonidan iste'mol qilinadi 6)redusentlar tomonidan parchalangan mahsulot	1,4,6	2,3,6	2,4,5	4,5,6	D		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-06-media-01.png		t	\N
7	4	7	Quyida uzoq vaqt och qolgan organizmdagi zaxiralarning sarflanishiga doir grafik keltirilgan.Grafikga qarab noto'g'ri xulosalarni aniqlang 1)oqsil zaxirsi,uglevod zaxirasi tugagandan so'ng ishlatilishni boshlaydi 2)7 hafta ichida lipid zaxirasi to'liq sarflanadi 3)uglevod zaxirasi eng birinchi bo'lib tugaydi 4)uzoq vaqt och qolish oqsil zaxirasiga ta'sir qilmaydi 5)lipid uzoq vaqt ochlikda eng ko'p ishlatiladigan zaxira 6) 7 hafta ichida uglevod zaxirasi to'liq ishlatiladi	1,3,6	3,5,6	1,2,4	1,4,6	C		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-07-media-01.png		t	\N
8	4	8	Rasmdan xulosa chiqarib shu teri tuzilishidagi organizmni aniqlang	lansetnik	oq amur	kapcha ilon	qurbaqa	D		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-08-media-01.png		t	\N
9	4	9	Habashiston biogeografik hududida uchrovchi issiqqonli organizmlarni aniqlang 1)xameleon 2)begemot 3)zirxli 4)giyena iti 5)lemur 6)agama	2,4,5	2,3,6	1,4,5	1,2,6	A		\N		f	\N
10	4	10	Quyidagi grafik o'simlikda kun davomidagi fotosintez va nafas olish tezligining o'zgarishini ko'rsatadi. Shunga ko'ra, quyidagi fikrlardan qaysilari to'g'ri? I. O'simlik yorug'lik bo'lgan barcha vaqt davomida atmosferaga kislorod chiqaradi. II. O'simlikning tush vaqtida atmosferadan qo'shimcha kislorod olishi shart emas. III. O'simlikning tush vaqtida tashqaridan qo'shimcha karbonat angidrid olishi shart emas.	Faqat I	Faqat II	I va II	II va III	B		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-10-media-01.png	I, II va III	t	\N
11	4	11	Yirtqichlar nomini ularga mos keladigan xususiyatlar bilan juftlab yozing. a) qora kalxat; 1) boshida ikki to‘p pati bor; b) tasqara; 2) dumi ayri, daraxtga uya quradi; d) ukki; 3) kechqurun o‘lja qidiradi; e) boyo‘g‘li. 4) havoda qanot qoqmasdan ucha oladi	a-3,b-4,d-1,e-2	a-2,b-4,d-1,e-3.	a-2,b-3,d-1,e-4	a-2,b-1,d-4,e-3	B		\N		f	\N
12	4	12	Quyidagi rasmlarda hujayraning meiozida gomologik xromosomalar juftligida sodir bo'ladigan ba'zi hodisalar raqamlash orqali ko'rsatilgan. Qaysi rasmda krossingover jarayoni tasvirlangan	Ⅰ	Ⅲ	Ⅱ	Ⅳ	A		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-12-media-01.png		t	\N
13	4	13	Quyidagi chizmada qo‘ldagi suyak va mushaklarning o‘zaro bog‘lanishi ko‘rsatilgan. Bilak suyagining 1 va 2 raqamli harakatlari haqida berilgan fikrlardan qaysi biri NOTO‘G‘RI?	Yozuvchi muskulning qisqarishi bilan 2-raqamli harakat sodir bo‘ladi.	1-raqamli harakatni bukuvchi muskul amalga oshiradi.	1 va 2 raqamli harakatlarning ikkalasida ham energiya (ATF) sarflanadi.	Yozuvchi muskul tolalari qisqarganda 1-raqamli harakat sodir bo‘ladi.	D		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-13-media-01.png	Bukuvchi muskulning qisqarishi natijasida 2-raqamli harakatga qarama-qarshi harakat yuzaga keladi.	t	\N
14	4	14	Rasmdagi jarayon hayotning qaysi darajasida sodir bo’ladi	biogeotsenoz	populatsiya	biosfera	organizm	C		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-14-media-01.png		t	\N
15	4	15	Quyidagi grafikda qon aylanish sistemasi tasvirlangan unga ko'ra o'pka arteriyasi qaysi raqam bilan berilgan	2	8	3	1	C		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-15-media-01.png		t	\N
16	4	16	Quyidagi grafikda ko‘l ekotizimidagi baqalar populyatsiyasi individlari sonining vaqtga bog‘liq o‘zgarishi ko‘rsatilgan. Ushbu grafikka asoslanib: I. II vaqt oralig‘ida yosh individlar soni qari individlar sonidan ko‘p bo‘lishi mumkin; II. Agar populyatsiyada migratsiya bo’lmasa, IX vaqt oralig‘ida populyatsiyadagi o‘lim koeffitsiyenti (darajasi) tug‘ilish koeffitsiyentidan yuqori bo‘lishi kuzatiladi; III. VII vaqt oralig‘idan keyin individlar soni kamayishining sababi faqat emigratsiyadir (tashqi migratsiya). Berilgan mulohazalardan qaysilari to‘g‘ri?	Faqat II	I va II	I va III	II va III	B		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-16-media-01.png	I, II va III	t	\N
17	4	17	Quyidagi rasmda alveoladagi gazlar almashinuvi aks etgan.Unga ko'ra quyidagi ma'lumotlarni taxlil qiling. 1)kapilyardagi kislorod bosimi alveoladagi kislorod bosimiga nisbatan baland 2)gemoglobinning globulin qismi kislorodni o'ziga biriktiradi 3)alveoladagi karbonat angidrid bosimi kapilyardagi karbonat angidrid bosimidan past 4)kapilyardan alveolaga azot umuman o'tmaydi	TNTN	TNNT	TNTT	NNTN	D		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-17-media-01.png		t	\N
18	4	18	Rasmda yashash uchun kurashni qaysi turi berilgan	turlararo	tur ichida	populatsiyalararo	abiotik omillarga qarshi	B		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-18-media-01.png		t	\N
19	4	19	Qalampir o’simligida spermatagenez jarayonida 15 ta mikrosporosit qatnashdi hosil bo’lgan spermiylarning 40%i nobud bo’lgan bo’lsa nechta urug’ hosil bo’lganini aniqlang	72	36	48	24	B		\N		f	\N
20	4	20	Rasmda kimyoviy sinapsning tuzilishi berilgan.Ushbu tuzilmaning 3 ta asosiy bo’lmagan tarkibiy qismini aniqlang 1)mediator 2)postsinaptik membrana 3)presinaptik membrana 4)vezikula 5)membranalararo to’siq 6)retseptor	1,2,6	2,3,5	1,4,6	2,4,6	C		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-20-media-01.png		t	\N
21	4	21	Jadvalda 2ta quyondagi dissimillatsiya jarayonlari aks etgan 2-quyon hujayrasida necha molekula glukoza to’liq parchalangan	2mol	1mol	3mol	4mol	B		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-21-media-01.png		t	\N
22	4	22	Rasmdagi o’simliklar uchun umumiy xususiyatni aniqlang	ikki urug’pallali	to’pguli murakkab soyabon	yorug’sevar o’simliklar	poyasi yog’ochlashgan	C		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-22-media-01.png		t	\N
23	4	23	Quyidagi grafikda oshqozonda oziq moddalarning o’zgarishi berilgan unga fikrlarni to’g’ri va noto’g’riga ajrating. (Vertikal-yuqoriga:modda miqdori,Gorizantal-yonga:o’tga vaqt) 1)X-aminokislota miqdoriga to’g’ri keladi 2)Z-glukozaga to’g’ri keladi 3)Y-moyga to’g’ri keladi	TTT	NNT	NTT	TNN	A		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-23-media-01.png		t	\N
24	4	24	Populyatsiyalardagi tarqalishni (joylashuvni) ko‘rsatuvchi I, II va III raqamli chizmalarda ifodalangan tarqalish turlari quyidagilarning qaysi birida to‘g‘ri berilgan?	Tasodifiy Guruhli Bir – tekis	Bir – tekis Guruhli Tasodifiy	Guruhli Tasodifiy Bir – tekis	Tasodifiy Bir – tekis Guruhli	C		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-24-media-01.png	Bir – tekis Tasodifiy Guruhli	t	\N
25	4	25	DNKning uzunligi 102 nmni tashkil qilsa va mutatsiyadan so’ng DNKda 30 juft nukleotid yo’qolsa jarayondan so’ng hosil bo’lgan DNKdan sintezlangan oqsilni massasini aniqlang	10800	12000	4800	14400	A		\N		f	\N
26	4	26	Quyidagi sxemada refleks yoyining soddalashtirilgan shakli aks etgan.Unga ko’ra motoneyronning shikastlanishi qaysi kasallikni keltirib chiqaradi.	nevrit	nevralgiya	poliomiyelit	fenilkutonoriya	A		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-26-media-01.png		t	\N
27	4	27	Quyidagi jadvalda harflar bilan berilgan qismlar insondagi qaysidir sistemaga to’g’ri keladi shunga ko’ra A sistemada funksiya hujayra yoki qismlarni aniqlang. 1)alveola 2)vorsinka 3)trombosit 4)nefron 5)kiprikli hujayralar 6)eozonofill leykosit 7)J-retseptorlar	3,6	2,7	1,5	2,4	B		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-27-media-01.png		t	\N
28	4	28	Suv ekotizimidagi fitoplankton va zooplankton populyatsiyalari sonining dinamikasi (o'zgarishi) grafigi berilgan. Grafik ma'lumotlariga tayanib, quyidagi mulohazalardan qaysilari to'g'ri? I. Fitoplanktonlar zooplanktonlarga nisbatan vaqt jihatidan oldinroq muhitning sig'im chegarasiga erishadi. II. Kuz faslining boshidan e'tiboran har ikkala populyatsiyada ham regressiya (sonining kamayishi) kuzatiladi. III. Yilning barcha oylarida fitoplanktonlar zichligi zooplanktonlar zichligidan yuqori bo'ladi.	Faqat I	Faqat II	I va II	I va III	A		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-28-media-01.png	II va III	t	\N
29	4	29	Quyidagi rasmda nafas olish a’zolari berilgan raqamlarda berilgan.Unga ko’ra qismlar to’g’ri juftlangan qatorni aniqlang 1)alveola 2)bronx 3)halqum 4)traxeya 5)bronxiola	Ⅰ-3,Ⅲ-2	Ⅱ-4,Ⅲ-5	Ⅳ-2,V-1	Ⅰ-3,Ⅲ-5	A		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-29-media-01.png		t	\N
30	4	30	Quyidagi rasmda umurtqali hayvonlar aks ettirilgan va rim raqamlari ulardagi o'xshashlikni ifoda etadi.Bunga ko'ra xato juftlangan javobni aniqlang	Ⅳ-4 kamerali yurak	Ⅲ-o'pka orqali nafas olish	Ⅰ-suyak	Ⅱ-bosh miya	C		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-30-media-01.png		t	\N
31	4	31	Quyida 1 litr suv ichgan insonning siydik hosil qilishidagi ba'zi o'zgarishlar ko'rsatilgan. Grafiklarga ko'ra, quyidagi fikrlardan qaysilari to'g'ri? I. Suv iste'mol qilinishi siydik hajmining oshishiga sabab bo'lgan; II. Buyraklar orqali chiqarilgan jami erigan modda miqdori nisbatan o'zgarmasdan qolgan; III. Buyraklarning bu reaksiyasi, haddan tashqari ko'p suv ichilganda plazma konsentratsiyasining keskin kamayib ketishining oldini oladi.	Faqat I	Faqat II	Faqat III	I va III	E		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-31-media-01.png	I, II va III	t	\N
32	4	32	Quyidagilar ichidan normal holatda diploid to’plamga egalarini aniqlang	2,3,7,13	3,10,11,12	1,2,10,11	2,10,12,13	B		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-32-media-01.png		t	\N
33	4	33	Zamburug’lar yashashi uchun kerakli narsalarni ajrating 1)suv 2)yorug’lik 3)namlik 4)ozuqa	1,2,4	1,2,3	2,3,4	1,3,4	D		\N		f	\N
34	4	34	Rasmdagidek tajriba moslamasi tayyorlanib, suv hammomida ketma-ket 20 C0, 30 C0 va 40 C0 haroratda o'n daqiqadan ushlab turilib, tajriba takrorlanadi. Tajriba davomida har 2 daqiqa oraliqda manometrdagi rangli suyuqlik darajasi o'qib boriladi va qayd etiladi. Bunga ko'ra, ushbu tajriba quyidagilardan qaysi birini o'lchash uchun mo'ljallangan bo'lishi mumkin?	Pivo achitqisi eng faol bo'ladigan shakar eritmasi konsentratsiyasini	Pivo achitqisining metabolik faolligi bilan muhit harorati orasidagi bog'liqlikni	Pivo achitqisi iste'mol qilgan shakar miqdorini	Shakar + pivo achitqisi eritmasi bo'lgan probirkadan qaysi gaz chiqayotganini	B		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-34-media-01.png	Shakar + pivo achitqisi eritmasi bilan oddiy shakar eritmasi orasidagi osmotic bosim farqini	t	\N
35	4	35	Quyida umrtqalilarga mansub sinflardagi nerv,qon aylanish va nafas olish sistemalari berilgan.Sutemizuvchilarga oid sistemalar qaysi raqam bilan belgilanganligini aniqlang	1	4	3	5	D		/uploads/6-ta-variant-maxsus-javobli/variant-01/question-35-media-01.png		t	\N
36	4	36	O‘qituvchi qanday didaktik qonuniyatlarga amal qilishi lozim?	Bilish, tushunish, qo‘llash, tahlil qilish, sintez qilish, baholash	Yodlash va qayta takrorlash	Faqatgina tushunish va qo‘llash	Amaliy mashg‘ulotlarga e’tibor bermaslik	A		\N		f	\N
37	4	37	Dars nima?	O‘quvchilarning mustaqil ta’lim olish usuli	O‘qituvchi rahbarligida belgilangan vaqt davomida ta’lim jarayonining asosiy shakli	Mustaqil ish va o‘quvchilar bilan savol-javobdan iborat ta’lim shakli	Faqat nazariy bilim beriladigan ta’lim shakli	B		\N		f	\N
38	4	38	Ta’limning qaysi shakli noan’anaviy hisoblanadi?	An’anaviy dars	Mustaqil ish darsi	Dars-seminar, dars-musobaqa, dars-sayohat	Bilimlarni takrorlash darsi	C		\N		f	\N
39	4	39	O‘z-o‘ziga ta’sir qilishning eng muhim usullaridan biri qaysi?	O‘z-o‘zini ishontirish	Faqat amaliy mashg‘ulotlar o‘tkazish	O‘z-o‘zini jazolashsiz ish yuritish	Faqat darsliklar bo‘yicha ishlash	A		\N		f	\N
40	4	40	Zamonaviy o‘qituvchi qanday kompetensiyalarga ega bo‘lishi lozim?	Texnologik, kommunikativ va didaktik kompetensiyalarga	Faqat o‘z fanini yaxshi bilishi kerak	O‘quvchilarga do‘stona munosabatda bo‘lish	Ta’lim jarayonini nazorat qilish	A		\N		f	\N
41	4	41	O‘quvchi olgan bilimlarini amaliy vaziyatlarda qo‘llay oladi (formulalar, modellarda). Bu Blum taksonomiyasining qaysi bosqichiga xos?	Tushunish	Qo‘llash	Baholash	Sintez	B		\N		f	\N
42	4	42	Dars jarayonida o‘quvchilar kichik guruhlarga bo‘linib, berilgan muammo yoki vaziyat bo‘yicha o‘z fikrlarini bildiradilar va hamkorlikda yechim topadilar. Bu qaysi metod?	Suhbat	Illyustratsiya	Interfaol metod	Tushuntirish	C		\N		f	\N
43	4	43	Direktor o‘quv ishlari bo‘yicha o‘rinbosari o‘qituvchining darsiga tahliliga kirdi. Darsda o‘qituvchi va o‘quvchi orasidagi muhit yaxshi ekanligini, o‘quvchilarning hozir javobligini ko‘rdi va baholadi. O‘quv ishlari bo‘yicha direktor o‘rinbosari dars tahlilini qanday turidan foydalangan?	Psixologik	Metadologik	Pedagogik	Uslubiy	A		\N		f	\N
44	4	44	O‘qituvchi o‘ziga tashqaridan qaraydi, metapozitsiyada turadi, o‘z xatti-harakatlarini kuzatadi. Tashqi omillar ichki mulohazalarga aylanadi. Faoliyat maqsadi aniqlanadi, refleksiv "MEN" shakllanadi. Bu holat o‘qituvchining kasbiy refleksiyasi asosida pedagogik mahoratining rivojlanishiga oid qaysi bosqichga tegishli?	O‘z-o‘zini belgilash	O‘z-o‘zini anglash	O‘z-o‘zini bilish	O‘z-o‘zini nazorat qilish	B		\N		f	\N
45	4	45	Sinfda ikki o‘quvchi o‘zaro janjallashib qolgan. Buning ortidan sinf ichida guruh-guruh bo‘linish holatlari sezila boshladi. Sinf rahbari qanday yo‘l tutishi kerak?	Ikkala o‘quvchining ota-onasini chaqirib, ularning farzandlarini ogohlantirish kerak	Bu kabi vaziyatlarga aralashmaslik kerak, o‘quvchilar o‘zlari hal qiladi	Vaziyatni chuqur o‘rganib, sinfda do‘stona muhit yaratishga qaratilgan suhbatlar tashkil etish, barcha o‘quvchilarni jamoaviy mas’uliyatga jalb qilish lozim	Ikkala o‘quvchini vaqtincha boshqa joylarga o‘tkazish haqida rahbariyatga murojaat qilish kerak	C		\N		f	\N
46	4	46	O‘quvchi sizning darsingiz unga foydali emasligini (ya’ni, unga fan kerakmasligini, tushunib o‘zlashtirishni yoki qiziqishini yo‘qolganini) aytib… o‘zlashtirishi pastlab... Bunday holatda qanday yo‘l tutasiz?	O‘quvchi bilan individual suhbat o‘rnatib, uning qiziqishlarini aniqlashga harakat qilaman.	O‘quvchini darsga qaytarib jalb qilish uchun motivatsion gaplar aytaman	Darsni yanada qiziqarli va interaktiv qilish uchun yangi metodlarni joriy qilaman	O‘quvchini sabrli bo‘lishga undayman va uning fikrini inobatga olgan holda darsni davom ettiraman	A		\N		f	\N
47	4	47	O‘qituvchi darsga tayyorgarlik ko‘rish jarayonida bir nechta uslubiy yondashuvlarni ko‘rib chiqadi. Har bir variantning o‘quvchilar faoliyatiga qanday ta’sir ko‘rsatishini oldindan tahlil qiladi va eng samarali deb hisoblagan yondashuvni tanlaydi. Bu o‘qituvchining qaysi faoliyatiga misol bo‘la oladi?	Tashxislash	Rag‘batlantirish	Axborot tahlili	Bashoratlash	D		\N		f	\N
48	4	48	Pedagogik jarayon kutilmagan hodisa va anglashilmovchiliklardan holi emas. Bunday holatlar turli ko‘rinishdagi nizolarni keltirib chiqaradi. Agar o‘qituvchi nizolarni hal qilishda o‘zini xatti-harakatini tahlil qilib, muammoni anglash va echishga harakat qilsa, nizoga sabab bo‘lgan tomonlarga murosali munosabatda bo‘lsa va nizoni ijobiy hal qilishga intilsa, bu qanday tarzda harakat qilinishini anglatadi?	Tushunish va murosa qilish yo‘li ko‘rsatilgan usul	E’tiborsizlik ko‘rsatish usuli	Kuch bilan bostirish yo‘li	Raqobat asosida hal etish usuli	A		\N		f	\N
49	4	49	Yuqori tajribaga ega o‘qituvchi o‘quvchilarga yanada kengroq va aniqroq tasavvur berish maqsadida o‘z darslarini boshqa fanlarni birlashtirgan holda o‘tkazadi. Buning uchun u ta’lim sohasidagi yangiliklardan bexabar qolmasligi ham muhim sanaladi. Bu vaziyatda zamonaviy pedagogga talab etiladigan qaysi burch va mas’uliyatni amalga oshiradi?	O‘qituvchi o‘z mutaxassisligi bo‘yicha chuqur va puxta bilimga ega bo‘lishi, barcha fanlar integratsiyasini o‘zlashtirish, bunday o‘qitishda uzluksiz ilmiy izlanishlar olib borishi lozim	O‘qituvchi faqat bir fan bo‘yicha bilimlarni chuqurlashtirishga harakat qilishi kerak	O‘qituvchi yangi metodlar o‘rganishga va qo‘llashga vaqt ajratmasligi kerak	O‘qituvchi faqat darsliklardan foydalanib, o‘quvchilarga ta’lim berish	A		\N		f	\N
50	4	50	Pedagog devorga rasm ildi. Unda mahalladagi eski uylar orasida bir bola toshga o‘tirib olgani, uning yuzida charchoq, ko‘zlarida esa g‘am borligi, qo‘lida virta xaltacha, oyoq esa bir juft eskirgan etik ko‘rinib turgan edi. O‘qituvchi voqeani “Ko‘z oldiga keltirish”, shaxsiy munosabat bildirish, empatiya tuyg‘usini shakllantirish maqsadida bola qanday muammo bilan to‘qnash kelgan bo‘lishi mumkinligi haqida o‘quvchilardan so‘radi. Shunda pedagog qaysi ta’lim metodidan foydalandi?	Ta’limda tasvir metodi	Ta’limda tanqidiy fikrlash metodi	Ta’limda guruhli ishlash metodi	Ta’limda izohli metod	A		\N		f	\N
51	4	1	Quyida nechta to’g’ri fikr berilgan.? 1.To’liq o’zgarish bilan rivojlanuvchi oq chumolilarning yuragi va uyasi ko’p kamerali tuzilgan; 2.Hasharotlarning ayirish sistemasi bir uchi berk hisoblanib ayirish mahsulotlari qattiq ko’rinishda chiqadi bu esa suvni tejashga yordam beradi; 3.Toshko’mir davrida suvarak, ninachilar rivojlangan; 4.qandala va ninachilarning urg’ochilarida XO holatda bo’ladi.	1 ta	2 ta	3 ta	4 ta	B		\N		f	\N
52	4	2	Qulupnay o’simligida mevasining oq bo’lishi,qizil bo’lishiga nibatan retsesiv belgi hisoblanadi.Geterozigotalilar esa Pushti rangli mevaga ega bo’ladi.Tajriba Pushti mevali qulupnaylar o’zaro chatishishi natijasida 120 ta oq mevali qulupnay olingan bo’lsa,nechta Pushti mevali qulupnay olingan.	240	360	120	60	A		\N		f	\N
53	4	3	Quyidagilar ichida poykiloterm organizmlar soni nechta	4	3	5	2	A		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-03-media-01.png		t	\N
54	4	4	Bir o'quvchi no'xatlarda gul rangining irsiylanishi bo'yicha o'tkazgan tadqiqoti natijasida to'plagan ma'lumotlari quydagi girafikda ko’rsatilgan. Ushbu tadqiqotga asoslanib, quyidagi xulosalardan qaysi biri xato hisoblanadi?	No'xatlarda binafsha gul rangi oq gul rangi ustidan dominant	1-grafikda chatishtirilgan binafsha gulning genotipi gomozigotadir	2-grafikdagi chatishtirish natijasida hosil bo'lgan binafsha gulli no'xatlarning barchasi geterozigotadir	3-grafikda chatishtirilgan oq gulli no'xatlar bilan yangi hosil bo'lgan oq gulli no'xatlarning genotiplari bir-biridan farq qiladi	D		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-04-media-01.png	1, 2 va 3-grafiklarda chatishtirilgan oq gulli no'xatlarning genotipi gomozigotadir	t	\N
55	4	5	Ushbu rasmda qaysi jarayon tasvirlangan.(Rasm tanlashda butun jarayon hisobga olinsin)	Yashash uchun kurash	Tabiiy tanlanish	Populatsiya chastotasi	Mutatsiya	B		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-05-media-01.png		t	\N
56	4	6	Tuproqdagi ayrim mineral va elementlarning miqdori hamda o'simlik tomonidan olinishi kerak bo'lgan miqdorlar quyidagi grafikda berilgan. Minimum qonuniga (Libix qonuni) ko'ra, o'simlikning o'sishini qaysi mineral cheklayotgan bo’lishi mumkin?	Fe	Ca	Zn	N	E		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-06-media-01.png	Mg	t	<div class="imported-question-image"><img src="/uploads/6-ta-variant-maxsus-javobli/variant-02/question-06-media-02.png" alt="Question media" style="max-width:100%;height:auto;" /></div>
57	4	7	Quyidagi jadvaldan foydalanib uglevodlarni vazifasi to’g’ri berilgan qatorni aniqlang.?	metabolik funksiya | plastikfunksiyasi | strukturafunksiyasi | himoyafunksiyasi	retseptorlik funksiyasi | plastikfunksiyasi | strukturafunksiyasi | zaxirafunksiyasi	retseptorlik funksiyasi | strukturafunksiyasi | plastikfunksiyasi | himoyafunksiyasi	struktura funksiyasi | strukturafunksiyasi | retseptorlikfunksiyasi | energetikfunksiya	C		\N		t	<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;margin-left:-5.6500pt;border:none;\nmso-border-left-alt:0.5000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;mso-border-insideh:0.5000pt solid windowtext;mso-border-insidev:0.5000pt solid windowtext;\nmso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Vairant</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="244" valign="top" style="width:122.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">plazmatik</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">membrananing</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">uglevod komponentlari</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="191" valign="top" style="width:95.7000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">murein, xitin,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">pektin</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="191" valign="top" style="width:95.7000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">riboza, </span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">dezoksiriboza</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="191" valign="top" style="width:95.7500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;">geparin</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;">A</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="244" valign="top" style="width:122.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">metabolik funksiya</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="191" valign="top" style="width:95.7000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">plastik</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">funksiyasi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="191" valign="top" style="width:95.7000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">struktura</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">funksiyasi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="191" valign="top" style="width:95.7500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">himoya</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">funksiyasi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;">B</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="244" valign="top" style="width:122.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">retseptorlik funksiyasi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="191" valign="top" style="width:95.7000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">plastik</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">funksiyasi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="191" valign="top" style="width:95.7000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">struktura</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">funksiyasi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="191" valign="top" style="width:95.7500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">zaxira</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">funksiyasi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">C</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="244" valign="top" style="width:122.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">retseptorlik funksiyasi</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="191" valign="top" style="width:95.7000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">struktura</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">funksiyasi</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="191" valign="top" style="width:95.7000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">plastik</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">funksiyasi</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="191" valign="top" style="width:95.7500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">himoya</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">funksiyasi</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td></tr><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;">D</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="244" valign="top" style="width:122.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">struktura funksiyasi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="191" valign="top" style="width:95.7000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">struktura</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">funksiyasi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="191" valign="top" style="width:95.7000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">retseptorlik</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">funksiyasi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="191" valign="top" style="width:95.7500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">energetik</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">funksiya</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr></tbody></table></body></html>
58	4	8	Rh(-) Ⅱ qon guruhli insonning eritrositi tarkibidagi oqsillarni aniqlang 1)rezus omil 2)aglutinogen A 3)aglutinogen B 4)agglutinin a 5)agglutinin b 6)gemoglobin	1,2,6	2,6	1,5,6	3,6	A		\N		f	\N
59	4	9	Rasmdagi tuzilmada ikki qavatli lipidning qaysi qismlari bir-biriga qarab turibdi	gidrofill	gidrofob	tashqi gidrofill ichki gidrofob	tashqi gidrofob ichki gidrofill	B		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-09-media-01.png		t	\N
60	4	10	Ramsda nerv oxiri va ishchi o’rtasidagi sinaps berilgan bo’lsa,Ⅰ raqamdagi qismni aniqlang.	sinaps bo’shlig’i	retseptor	motoneyron	vesikula	C		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-10-media-01.png		t	\N
61	4	11	Quyidagi shaklda fotosintez reaksiyalari ko'rsatilgan. (Rasmda: Xloroplast ichida yorug'likka bog'liq reaksiyalar va Kelvin sikli (yorug'likka bog'liq bo'lmagan reaksiyalar) tasvirlangan.) Shunga ko'ra, fotosintezda iste'mol qilingan suv (H2O) molekulalarining tarkibidagi vodorod va kislorod atomlari hamda karbonat angidrid (CO2) molekulalarining tarkibidagi uglerod atomlari maxsus usul bilan nishonlanadigan bo'lsa (belgilansa): I. Yorug'likka bog'liq reaksiyalarda hosil bo'lgan kislorod (O2) molekulalari, II. Yorug'likka bog'liq reaksiyalarda hosil bo'lgan NADPH molekulalari, III. Yorug'likdan mustaqil reaksiyalarda (Kelvin sikli) hosil bo'lgan shakar (glyukoza) molekulalari berilganlardan kamida bir xil nishonlangan (belgilangan) atom saqlaydiganlarining hosil bo'lish ketma-ketligi quyidagilardan qaysi biri?	II - I – III	I - II – III	III - II – I	I - III – II	B		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-11-media-01.png	II - III – I	t	\N
62	4	12	Suv havzasida 600 ta yangi ulotriks ipi hosil bo’ldi bu iplarning 40% qismi zoosporalardan hosil bo’lgan bo’lsa ko’payishda ishtirok etgan izogametalar sonini aniqlang	360	90	180	240	C		\N		f	\N
63	4	13	Quyidagi grafikda qon aylanish sistemasi tasvirlangan unga ko'ra aorta qaysi raqam bilan berilgan	2	8	3	1	B		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-13-media-01.png		t	\N
64	4	14	Atamalar va ularga mos javoblar to’g’ri juftlangan qatorlarni aniqlang	1I,5A,10B	2E,7L,8F	3G,4H,6K	1K,6I,8L	A		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-14-media-01.png		t	\N
65	4	15	Quyida hazm qilingan oziq – ovqatning qon bilan aralashish diagrammasi keltirilgan Shunga ko’ra, quyidagi fikrlardan qaysi biri noto’g’ri?	yo’nalishi bo’yicha harakatlanadigan ovqatlar glyukoza va aminokislotalar kabi moddalardir.	K organi jigar bo’lib, u ba’zi ovqat hazm qilish mahsulotlarini ortiqcha miqdorda saqlaydi	M strukturasi peke sistemasi bo’lib, yog’ kislotalari va yog’da eriydigan vitaminlarni o’z ichiga oladi.	--à yo’nalishda tashiladigan moddalar yurakdan o’tishdan oldin jigar orqali o’tadi	D		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-15-media-01.png		t	<div class="imported-question-image"><img src="/uploads/6-ta-variant-maxsus-javobli/variant-02/question-15-media-02.png" alt="Question media" style="max-width:100%;height:auto;" /></div>
66	4	16	T. Engelmannning har xil to'lqin uzunligidagi nurlarning fotosintezga ta'sirini o'rgangan ishi quyidagicha modellashtirilgan. Ushbu ishga ko'ra, quyidagilardan qaysi biri noto'g'ri?	500-600 nm oraliqdagi to'lqin uzunligida yashil suvo'tlar kamroq fotosintez qiladi	Yorug'likning to'lqin uzunligi ortishi bilan fotosintez tezligi ham doimiy ravishda ortadi, deb umumlashtirish mumkin emas	Tajriba qizil suvo'tlar bilan o'tkazilsa ham, grafikdagi ma'lumotlar xuddi shunday bo'ladi	Binafsha rangli to'lqin uzunligida fotosintez tezligi yuqori	C		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-16-media-01.png	Fotosintez tezligining har xil to'lqin uzunligida turlicha bo'lishi xlorofillning nurni yutish darajasi bilan bog'liq	t	\N
67	4	17	Baliqlar turini ular tarqalgan joylar nomi bilan birga juftlab yozing. a) mo‘ylov baliq; 1) Sirdaryo, Amudaryoning quyi oqimida; b) moy baliq; 2) Hind okeanining Afrika sohili yaqinida; d) qora baliq; 3) tog‘ daryolarida e) gulmoy; 4) daryolar havzasi va ko‘llarda; f) soxta kurakburun; 5) Sirdaryo va Amudaryoda; g) latimeriya. 6) Sirdaryo, Amudaryoning quyi va o‘rta oqimida.	a4,d3,g2	a4,b1,f3	b4,d3,f6	b1,e3,g2	A		\N		f	\N
68	4	18	Quyidagi sxema organizmda uglevod almashinuvini ifoda etadi.Unga ko’ra berilgan ma’lumotlarni taxlil qiling. 1)insulin asosan ochlik paytida faoliyat yuritadi 2)glukogon oshqozon osti bezida sintezlanadi 3)jigarda qondagi glukozaga sezgir hujayralar bo’ladi. 4)insulin jigardagi uglevod miqdorini kamaytiradi	TNNT	TNTN	NNTT	NTNN	A		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-18-media-01.png		t	\N
69	4	19	Quyida urug’lanish jarayoni aks etgan.Berilgan belgilarning qaysilari zigotaga ham tuxum hujayra ham spermatazoid orqali berilishi mumkin. 1)sochning shakli 2)daltonizm 3)tepakallik 4)braxidaktiliya 5)mitoxondrial sitopatiya 6)sepkillilik	1,3,6	2,3,5	1,2,5	1,4,6	C		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-19-media-01.png		t	\N
70	4	20	Atamalar va ularga xos xususiyatlar noto'g'ri juftlangan javobni aniqlang.	2B,5D,9I	1I,4B,8K	2J,6E,10I	3B,7E,9K	C		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-20-media-01.png		t	\N
71	4	21	Jadvalda 2ta quyondagi dissimillatsiya jarayonlari aks etgan 1-quyon hujayrasida necha molekula glukoza to’liq parchalangan	2mol	1mol	3mol	4mol	A		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-21-media-01.png		t	\N
72	4	22	Bioremediatsiya — xavfli moddalarni zararsiz yoki kamroq zararli moddalarga parchalash uchun mikroorganizmlardan foydalaniladigan uzoq muddatli tozalash usulidir. Quydagi grafik laboratoriya sharoitida uran bilan ifloslangan yer osti suvining bioremediatsiya jarayonini ko'rsatadi. Bunga ko'ra; I. Muhitga etanol qo'shilgandan keyin mikroorganizmlar faolligi oshgan; II. Uran bilan ifloslangan yer osti suvini tozalash 100-kunda yakunlangan; III. Mikroorganizmlar uranni o'z hujayralarida to'plagan; Ushbu fikrlardan qaysilari to’g’ri bo’lishi mumkin?	Faqat I	Faqat II	Faqat III	I va II	A		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-22-media-01.png	II va III	t	\N
73	4	23	Grafikda to'rtta fermentning (Pepsin, Dekarboksilaza, Amilaza, Arginaz) muhit pH qiymatiga qarab reaksiya tezligining o'zgarishi ko'rsatilgan. Grafik ma'lumotlariga ko'ra, qaysi fikr xato?	Pepsin fermenti faqat kislotali muhitda ishlaydi	Dekarboksilaza fermenti pepsin bilan bir xil muhitda ishlay olmaydi	Amilaza va dekarboksilaza fermentlarining optimum (eng yaxshi) pH qiymatlari har xil	Dekarboksilaza fermenti ishlay oladigan barcha muhitlarda arginaz fermenti ham ishlay oladi	D		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-23-media-01.png	Arginaz va amilaza fermentlarining birgalikda ishlay oladigan pH oralig'i mavjud	t	<div class="imported-question-image"><img src="/uploads/6-ta-variant-maxsus-javobli/variant-02/question-23-media-02.png" alt="Question media" style="max-width:100%;height:auto;" /></div>
74	4	24	Quyidagi jadvalda harflar bilan berilgan qismlar insondagi qaysidir sistemaga to’g’ri keladi shunga ko’ra C sistemada funksiya bajaruvchi moddalarni aniqlang. 1)atsetilxolin 2)pepsin 3)insulin 4)surfaktant 5)gemoglabin 6)lizotsim	4,6	2,5	1,2	3,5	D		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-24-media-01.png		t	\N
75	4	25	O'ng yarimshar po'stlog'ida joylashadi gan oliy nerv markazlari…… 1) hisoblash 2) hid bilish 3)geometrik obrazlar 4)ohang 5)nutq	1,3,4	1,2,5	1,4,5	2,3,4	D		\N		f	\N
76	4	26	Bir hayvon hujayrasidan olingan triglitserid, glikogen va oqsil molekulalari alohida-alohida tajriba naychalariga qo'yilgan. Bu naychalarga molekulalarni tarkibiy qismlarigacha (monomerlarigacha) parchalaydigan (hazm qiluvchi) fermentlar qo'shilgan va yetarli vaqt kutilgan. Bunga ko'ra, ushbu jarayonda sodir bo'ladigan o'zgarishlar haqidagi quyidagi fikrlardan qaysilari to'g'ri? I. 1-naychada efir, 2-naychada glikozid, 3-naychada esa peptid bog'lari uzilgan. II. 1 va 3-naychalarda hosil bo'lgan tarkibiy qismlar (monomerlar) muhitning pH qiymatini tushirishi mumkin. III. 2-naychada faqat bir turdagi monomer hosil bo'ladi.	Faqat I	I va II	I va III	II va III	E		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-26-media-01.png	I, II va III	t	\N
77	4	27	Oziq zanjiri O’simlik-quyon-tulki ketma-ketligi bo’yicha shakllangan. Tulkining uchta bolasi har biri 500grdan semirgan bo’lsa quyon iste’mol qilgan o’simlik massasini aniqlang	150kg	50kg	1500kg	500kg	C		\N		f	\N
78	4	28	Quyidagi atamalarni ularga tegishli izohlar bilan juftlang	1D,3A,5B	2E,3B,4F	2E,4F,5A	1E,3F,4A	A		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-28-media-01.png		t	\N
79	4	29	Bir guruh tadqiqotchilar yopiq urug'li o'simliklardan olingan barglarni quyidagi uskunada ko'rinib turganidek, yopiq idish ichiga teskari holatda joylashtirdilar. Idish ichiga barg bandidan suv chiqqunga qadar bosimli havo haydashdi va suv birinchi chiqqan paytdagi idish ichidagi bosimni qayd etishdi. Tadqiqotchilar turli o'simliklardan olingan barglarda suvning barg bandidan chiqish bosimi qiymatlari bir-biridan farqli ekanligini kuzatishdi. Bunga ko'ra, tadqiqotchilar quyidagilardan qaysi birini o'rganmoqdalar?	Transpiratsiya (bug'lanishni)	Ildiz bosimi	Koheziya kuchi (suv molekulalarini bir biriga yopishish kuchi)	Fotosintez tezligi	A		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-29-media-01.png	Nafas olishning fotosintezga nisbati	t	\N
80	4	30	Atamalar va ularga mos javoblar to'g'ri juftlangan javoblarni aniqlang	3-H,6-E,8-A	1-I,4-F,7-A	2-D,6-G,9-F	1-K,5-B,7-H	A		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-30-media-01.png		t	\N
81	4	31	Quyida quloqda eshitish jarayoni va asosiy (bazilyar) pardadagi tebranish grafiklari berilgan Bunga ko‘ra: ifodalaridan qaysilari to‘g‘ri? I. Uzangining oval darchaga qarshi tebranishi chig‘anoq perilimfa suyuqligida bosim to‘lqinlarini hosil qiladi. II. Grafiklarda chastota qanchalik yuqori bo‘lsa, tebranish oval darchaga shunchalik yaqin bo‘ladi. III. To‘lqinlardagi energiya asosiy pardaning tebranishiga yo’l ochadi va tukli hujayralarni uyg‘otadi.	Faqat I	Faqat II	I va II	I va III	E		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-31-media-01.png	I, II va III	t	<div class="imported-question-image"><img src="/uploads/6-ta-variant-maxsus-javobli/variant-02/question-31-media-02.png" alt="Question media" style="max-width:100%;height:auto;" /></div>
82	4	32	Rasmda tasvirlangan organizmlarni sovuq haroratli muhitda tanasida muz kiristallari hosil bo’lishiga yo’l qo’ymaydigan qaysi modda to’planadi.?	a – glitsirin; b – glikoproteinlar	a – glitsirin; b – glikolipid	a – glikolipid; b – glitsirin	a – glikoproteinlar; b – glitsirin	D		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-32-media-01.png		t	\N
83	4	33	Baliqning hazm qilish sistemasi organlarini ularga mos keladigan belgilar bilan birga juftlab yozing. Hazm qilish a'zolari;a)halqum;b)oshqozon;d)oshqozonosti bezi;e)o‘t pufagi; f)ichak; g) orqa ichak. Hazm qilish a'zolari funksiyalari;1) ovqat hazm bo‘ladi va qonga so‘riladi; 2) rivojlanmaydi; 3) uch qator tishlar joylashgan; 4) oziq qoldig‘ini chiqarib turadi; 5) o‘t suyuqlig‘i to‘playdi; 6) hazm shirasi ishlab chiqaradi.	a3,d6,e5	b5,d6,g4	a3,e5,f4	b6,f1,g4	A		\N		f	\N
84	4	34	Quyidagi grafik atrof-muhit haroratiga bog‘liq holda stomalar (og‘izchalar) ochilish darajasini ko‘rsatadi. Ushbu grafikka asoslanib, quyidagi fikrlardan qaysi biri xato hisoblanadi?	Fotosintez tezligi stoma ochilish darajasiga to‘g‘ri proporsional ravishda o‘zgaradi.	9 °C dagi stoma ochilish darajasi bilan 32 °C dagi stoma ochilish darajasi birbiriga yaqin.	20 °C gacha stoma hujayralarida turgor bosimi ortadi.	Yuqori harorat transpiratsiyani (bug‘lanishni) oshirganligi sababli stomalar yopilgan.	A		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-34-media-01.png	Harorat stomaning ochilib-yopilishini ta'minlovchi belgilovchi omillardan biridir.	t	\N
85	4	35	To'g'ri fikrlarni aniqlang.	1,3,9	2,5,7	2,4,5	1,4,7	A		/uploads/6-ta-variant-maxsus-javobli/variant-02/question-35-media-01.png		t	\N
86	4	36	O‘qituvchining texnologik madaniyati deganda nima tushuniladi?	O‘qituvchining dars o‘tishda texnologik vositalarni qo‘llash qobiliyati	Texnik jihozlardan foydalanish majburiyati	Kompyuterda ishlash qobiliyati	Dars rejasini kompyuterda yozish	A		\N		f	\N
87	4	37	Zamonaviy o‘qituvchi qanday kompetensiyalarga ega bo‘lishi lozim?	Texnologik, kommunikativ va didaktik kompetensiyalarga	Faqat o‘z fanini yaxshi bilishi kerak	O‘quvchilarga do‘stona munosabatda bo‘lish	Ta’lim jarayonini nazorat qilish	A		\N		f	\N
88	4	38	Darsni yuksak pedagogik mahorat talablariga asoslangan holda o‘tkazish qaysi talabga kiradi?	Tarbiyaviy talab	Rivojlantiruvchi talab	Ta’limiy talab	Nazorat talabi	C		\N		f	\N
89	4	39	Ta’lim jarayonining asosiy talablariga qaysilar kiradi?	Tarbiyaviy, rivojlantiruvchi, ta’limiy talablar	Faoliyat, baholash va test talablar	Nazorat, jazo va rag‘batlantirish	Mashg‘ulotlar, seminarlar va nazorat ishlari	A		\N		f	\N
90	4	40	Aralash darsda qaysi bosqichlar bo‘lishi mumkin?	Yangi materialni tushuntirish, mustahkamlash, bilimlarni tekshirish, baholash	Faqat yangi materialni o‘rganish	Nazorat ishi va test yechish	Mustaqil ish va darslik bilan ishlash	A		\N		f	\N
91	4	41	Kommunikativ nutqning muvaffaqiyatli bo‘lishi uchun quyidagi maxsus qobiliyatlarni qo‘llay olish zarur. Berilganlardan ishontira olish qobiliyatining asosiy tarkibini aniqlang: 1. Aniq dalillar va misollar keltirish orqali o‘z fikrini asoslash. 2. Mantiqiy va hayotiy asoslar bilan fikr yuritish. 3. Og‘zaki va vizual bo‘lishi mumkin bo‘lgan axborotni anglash. 4. Shaxsiy va quvnoq kayfiyat orqali tinglovchilarning e’tiborini jalb etish.	1, 2, 3	2, 3, 4	1, 3, 4	1, 2, 4	D		\N		f	\N
92	4	42	O'qituvchi darsda doskaga do, mi, sol notalarini chizdi, so‘ng pianinoda ularni sol, mi, do tarzida chalib berdi. O‘quvchilar xatolikni darhol sezib, uni to‘g‘rilashdi. Ushbu holatda o‘qituvchi qaysi metoddan foydalangan?	Namoyish	Loyiha	Didaktik o‘yin	Hikoya	C		\N		f	\N
93	4	43	Ikki o‘quvchi o‘zaro tortishib, dars vaqtida janjallashib qoldi. Pedagog vaziyatni o‘nglash uchun tezkor chora ko‘rishi kerak. Qaysi yechim vaziyatni samarali boshqarishda to‘g‘ri bo‘ladi?	Ikkala o‘quvchini ham jazolab, ota-onalariga shikoyat qilish.	O‘quvchilarning har birining fikrini tinch va xolis tinglab, ularni kelishuvga chaqirish.	O‘quvchilarni boshqa sinflarga o‘tkazish.	O‘quvchilarning o‘zaro munosabatini sudga topshirish.	B		\N		f	\N
94	4	44	O‘quvchilardan ikki nafari darsdan so‘ng sport zalda tortishib qolishdi. O‘qituvchi ularni yoniga chaqirib, har birining fikrini tinglab, tinch muhitda gaplashib, ularni kelishishga undadi. Bu holatda o‘qituvchi qaysi usuldan foydalangan?	Ishontirish	Iltimos	Suhbat	Talab qo‘yish	C		\N		f	\N
95	4	45	Ikki o‘qituvchi o‘rtasida mehnat shartnomasi va moliyaviy masala bo‘yicha nizo yuzaga keldi. Tashkilot ichida hal bo‘lmagach, masala sudga olib chiqildi. Bu qaysi turdagi yechim hisoblanadi?	Rahbar buyrug‘i	Suhbat	Sud qarori	Komissiya	C		\N		f	\N
96	4	46	O‘quvchi ma’lumotni qismlarga ajratadi, sabab-oqibat aloqalarini tahlil qiladi, farqlarni aniqlaydi. Bu Blum taksonomiyasining qaysi bosqichiga xos?	Tahlil	Sintez	Baholash	Bilish	A		\N		f	\N
97	4	47	O'qituvchi dars davomida suv bug'ga aylanib havoga ko’tariladi va yana yomg'ir, qor ko'rinishida suvga aylanib yerga tushadi dedi va bu holatni doskada chizib ko’rsatdi. Yakunda o‘quvchilarni qay darajada tushunganligini bilish uchun savollar berdi. Bu qaysi metod?	Tasvir	Hikoya	Ma'ruza	Tushuntirish	D		\N		f	\N
98	4	48	Direktor o‘quv ishlari bo‘yicha o‘rinbosari o‘qtuvchining darsini tahlil qilish mobaynida ta'lim yo‘nalishidagi hukumat qarorlari, talablar, davlat tili, respublikadagi oxirgi o‘zgarishlarning mashg‘ulot davomida foydalanilishini kuzatdi. O‘quv ishlari bo‘yicha direktor o‘rinbosari dars tahlilini qanday turidan foydalangan?	Psixologik	Metadologik	Pedagogik	Uslubiy	B		\N		f	\N
99	4	49	O‘qituvchi o‘zining kasbiy ehtiyojlarini inobatga olib, faoliyatni oldindan rejalashtiradi. Strategik, taktik va tezkor vazifalarni ajratadi. Haqiqiy "MEN" va ideal "MEN" ni solishtiradi. Bu holat o‘qituvchining kasbiy refleksiyasi asosida pedagogik mahoratining rivojlanishiga oid qaysi bosqichga tegishli?	O‘z-o‘zini anglash	O‘z-o‘zini belgilash	O‘z-o‘zini bilish	O‘z-o‘zini rivojlantirish	B		\N		f	\N
100	4	50	7-sinf tarix fani o‘qituvchisi o‘quvchilarni darsga qiziqmayotganini sezib, qanday usuldan foydalanadi?	Tarixiy voqealarni o‘quvchilarga interaktiv o‘yinlar orqali tushuntirib, darsni qiziqarli qilishga harakat qiladi	O‘quvchilarga tarixiy mavzularni guruhlar bilan muhokama qilishni va o‘z fikrlarini erkin bildirishni taklif etadi	Tarixiy voqealarni o‘quvchilarning kundalik hayoti bilan bog‘lab, ularni tushunishga yordam beradi	O‘quvchilarga tarixiy voqealar bo‘yicha qisqa videolar va vizual materiallar ko‘rsatadi	A		\N		f	\N
101	4	1	K, L va M turlarida gemoglobinning kislorod (O2) bilan to‘yinish foizi berilgan Grafikka ko‘ra, ushbu turlar haqida quyidagi fikrlardan qaysilari to’g’ri bo’lishi mumkin? I. Metabolizm tezliklari turlicha. II. Vaqt birligi ichida gemoglobindan ajraladigan kislorod miqdorlari turlicha. III. Bir xil kislorod bosimi ostida gemoglobinga bog‘langan kislorod miqdorlari turlicha.	Faqat I	Faqat II	Faqat III	I va II	E		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-01-media-01.png	I,II va III	t	\N
102	4	2	No’xat o’simligida donning yashil bo’lishi sariq bo’lishiga nisbatan,burishgan bo’lishi silliq bo’lishiga nisbatan retsessiv belgi hisoblanadi.Tajribada sariq,silliq no’xat va yashil,burishgan no’xatlar o’zaro chatishtirildi va faqat bir xil genotipli no’xatlar olindi.F2 avlodning qancha qismini yashil,burishgan no’xatlar tashkil etadi.	1/16	1/8	3/16	1/4	A		\N		f	\N
103	4	3	II qon guruh bo‘yicha geterozigotali ayol III qon guruhli geterozigotali erkakka turmushga chiqsa,tug’ilishi mumkin bo’lmagan farzandi genotipini aniqlang	BB	AO	OO	BO	A		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-03-media-01.png		t	\N
104	4	4	Quyidagi tajribada dengiz cho'chqalarida yung shaklining irsiylanishi aks ettirilgan.Unga ko'ra 1-raqamli organizm genotipini toping.	AA	Aa	aa	AA yoki Aa	A		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-04-media-01.png		t	\N
105	4	5	Ushbu elektroforez tadqiqotida, DNK parchalarining og'irliklarini kichikdan kattaga qarab saralanishi quyidagilardan qaysi birida to'g'ri berilgan?	1 - 2 - 3 - 4 – 5	1 - 2 - 5 - 4 – 3	2 - 3 - 4 - 1 – 5	5 - 4 - 2 - 3 - 1	E		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-05-media-01.png	5 - 4 - 3 - 2 – 1	t	\N
106	4	6	Ramsda nerv oxiri va ishchi o’rtasidagi sinaps berilgan bo’lsa,Ⅲ raqamdagi qismni aniqlang.	sinaps bo’shlig’i	retseptor	postsinaptik membrana	vesikula	A		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-06-media-01.png		t	\N
107	4	7	Sharoit va uskunalar quyidagicha tayyorlanib, germetik (havo o'tkazmaydigan) idishga tirik sichqon joylashtirilgan va ma'lum vaqt kuzatilgan. Ushbu tajriba davomida quyidagi o'zgarishlarning qaysi biri sodir bo'lmaydi?	Idish ichidagi namlik miqdorining ortishi	Idish ichidagi havo bosimining o'zgarishi	Idishdagi kislorod (O2) miqdorining kamayishi	CO2 yutuvchi — kalsiy gidroksid (Ca(OH)2) eritmasi tiniqligining yo'qolishi (loyqalanishi)	E		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-07-media-01.png	Shisha naychadagi rangli suyuqlikning 18 raqami yo'nalishida harakatlanishi	t	\N
108	4	8	Quyidagi jadvaldagi ma'lumotlarni taxlil qilib,ma'lumotlarni to'g'ri va noto'g'riga ajrating	TTTNTN	TTTNTT	NTTNTN	TTNNTN	A		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-08-media-01.png		t	\N
109	4	9	Na’matak o’simligining bitta hujayrasida 30 molekula glukoza parchalandi.Glukozaning 30% to’liq parchalangan ushbu jarayonda xloroplastda sintezlangan barcha ATF hisobiga Glukoza sintezlangan bo’lsa ushbu sintezlangan glukoza molekulalari to’liq parchalanishidan qancha ATF molekulasi hosil bo’ladi	20520	369360	1140	19440	A		\N		f	\N
110	4	10	Grafikda arteriyalar, kapillyarlar va venalarning: I. Qonning oqish tezligi, II. Qon bosimi, III. Tomirning umumiy kesim yuzasi (maydoni), qiymatlarining o'zgarishi X, Y, Z harflari bilan ko'rsatilgan. Bunga ko'ra; X, Y, Z egri chiziqlari quyidagilarning qaysi birida to'g'ri juftlangan?	X Y Z I II III	X Y Z I III II	X Y Z II I III	X Y Z II III I	B		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-10-media-01.png	X Y Z III II I	t	\N
111	4	11	Quyidagi rasmda DNK polimeraza faolligining o'zgarishi ko'rsatilgan unga ko'ra Yni aniqlang Y	G1	sintez	G2	anafaza	A		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-11-media-01.png		t	\N
112	4	12	Grafiklarda inson tanasidagi X, Y, Z tomirlarining qatlamlari (endotel, elastic to'qima va silliq muskul) miqdori ko'rsatilgan. Grafikka ko'ra, qaysi fikrlar to'g'ri?	Qon va boshqa to'qimalar orasidagi modda almashinuvi Z tomirida amalga oshadi	X tomirining qon bosimi Y tomirinikidan yuqori	Z tomiri doimo karbonat angidridga boy qon tashiydi	Y tomiridagi qonning oqish tezligi X tomirinikidan yuqori	D		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-12-media-01.png	Y tomiri doimo kislorodga boy qon tashiydi	t	\N
113	4	13	Jadval asosida to’g’ri fikrni aniqlang.?	qora boyalich,buyurg`un, shuvoq | baliqko`z, qizil sho`ra,sarsazan | saksovul, sag`an,qumtariq, juzg`un,silen, iloq	saksovul, sag`an,qumtariq, juzg`un, silen,iloq | baliqko`z, qizil sho`ra,sarsazan | qora boyalich,buyurg`un, shuvoq	qumtariq, sarsazan,baliqko’z | qora boyalich, saksovul,yantoq, shuvoq | silen iloq, juzg’un	baliqko`z, qizil sho`ra | juzg’un, silen, iloq | qora boyalich,buyurg`un, shuvoq	D		\N		t	<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;margin-left:-5.6500pt;border:none;\nmso-border-left-alt:0.5000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;mso-border-insideh:0.5000pt solid windowtext;mso-border-insidev:0.5000pt solid windowtext;\nmso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Vairant</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="340" valign="top" style="width:170.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Sho`rxok tuproqli cho`l</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Qum tuproqli cho`llar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Gipsli cho`llar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;">A</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="340" valign="top" style="width:170.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">qora boyalich,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">buyurg`un, shuvoq</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">baliqko`z, qizil sho`ra,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">sarsazan</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">saksovul, sag`an,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">qumtariq, juzg`un,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">silen, iloq</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;">B</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="340" valign="top" style="width:170.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">saksovul, sag`an,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">qumtariq, juzg`un, silen,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">iloq</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">baliqko`z, qizil sho`ra,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">sarsazan</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">qora boyalich,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">buyurg`un, shuvoq</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;">C</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="340" valign="top" style="width:170.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">qumtariq, sarsazan,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">baliqko’z</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">qora boyalich, saksovul,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">yantoq, shuvoq</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">silen iloq, juzg’un</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">D</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="340" valign="top" style="width:170.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">baliqko`z, qizil sho`ra</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">juzg’un, silen, iloq</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">qora boyalich,</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">buyurg`un, shuvoq</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td></tr></tbody></table></body></html>
114	4	14	Quyidagilar ichidan o’troq tipidagi oziq zanjiriga kiruvchi organizmlarni aniqlang 1) quyon; 2) ko‘l baqasi; 3) mog‘or zamburug‘lari; 4) ninachi; 5) tuproq bakteriyalari; 6) terak; 7) spirogira; 8) sazan; 9) yomg‘ir chuvalchangi; 10) xongul; 11) eshakqurt; 12) o‘limtikxo‘r qo‘ng‘iz; 13) o‘tlar; 14) suvsar; 15) qirg‘iy.	1,2,4,12	2,3,6,11	4,5,8,14	2,3,5,9	C		\N		f	\N
115	4	15	Quyidagi oziq zanjiri berilgan.Unga ko'ra sichqonlar sonining ortishi natijasida kelib chiqadigan voqealarni taxlil qiling. 1)ilonlar soni kamayadi 2)o't-o'simliklar soni ortadi 3)tulkilar soni ortadi 4)ukkilar soni ortadi	TNNT	NTTN	NNTN	NNTT	D		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-15-media-01.png		t	\N
116	4	16	Quyidagi tajribada maltoza va laktoza aralashmasiga laktoza va maltoza parchalovchi fermentlar aralashmasi solindi tajribadan so'ng qaysi moddalar miqdori ortishini aniqlang 1)laktoza 2)glukoza 3)galaktoza 4)laktaza fermenti	1,2,3	2,3,4	1,4	2,3	C		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-16-media-01.png		t	\N
117	4	17	Quyidagi shaklda ko'rsatilganidek, bir muhitda yashaydigan bir turga mansub o'simliklar, ular yashaydigan vodiyning ko'lga aylanishi natijasida bir-biridan farqlana boshlagan. Ko'lning ikki tarafida yashaydigan o'simliklarning vaqt o'tishi bilan bir-biridan farqlanishida qaysi omillar ta'sir ko'rsatgan? I. Ikki guruh o'simlik orasida gen almashinuvining to'xtashi; II. Vodiyning suv bilan to'lishi natijasida geografik izolyatsiyaning (to'siqning) yuzaga kelishi; III. Guruhlarning o'zlari yashayotgan yangi muhitda har xil hasharotlar yordamida changlana boshlashi.	Faqat I	Faqat II	Faqat III	I va II	D		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-17-media-01.png	II va III	t	\N
118	4	18	Muayyan bir hududda yog‘inlar pH darajasining yillar davomida o‘zgarishi grafikda ko‘rsatilgan. pH darajasi 5,6 dan past bo‘lgan yomg‘irlar kislotali yomg‘ir deb hisoblanishini inobatga olib, quyidagi fikrlardan qaysilari to‘g‘ri? I. Kislota miqdori eng ko‘p bo‘lgan yomg‘irlar 1970-yilda yog’gan; II. 1985–1990-yillar oralig‘ida yomg‘irlarning pH darajasi avval ko‘tarilgan, so‘ng pasaygan; III. 2000-yildan boshlab yomg‘irlarning pH darajasi doimiy ravishda ko‘tarilgan;	Faqat III	I va II	I va III	II va III	C		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-18-media-01.png	I, II va III	t	\N
119	4	19	Ushbu uglevogdlar qatoridan monosaxaridlarni aniqlang	1,3,7,11	1,4,6,11	2,4,5,12	1,2,8,10	B		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-19-media-01.png		t	\N
120	4	20	Bezlar,ular ishab chiqaradigan gormonlar va bu gormonlar bilan bog'liq kasalliklarni juftlang. Ⅰ-gipofiz Ⅱ-ayrisimon 1)timozin 2)paratgormon 3)tiroksin 4)somatatrop a)nanizm b)miksedema c)tetaniya d)erta balog'atga yetish	Ⅰ-4-d, Ⅱ-1-b	Ⅰ-3-b, Ⅱ-4-c	Ⅰ-1-b, Ⅱ-2-d	Ⅰ-4-a, Ⅱ-1-d	D		\N		f	\N
121	4	21	Rasmdagi o‘simlik bargidan olingan namunadan to‘qima kulturasi usuli orqali yangi o‘simlik yetishtirish jarayoni ko‘rsatilgan. Ushbu jarayonda ona o‘simlikdan yangi o‘simliklar olinayotganda, quyidagi hodisalardan qaysilari sodir bo‘ladi? I. DNA replikatsiyasi (ko'payishi) II. Krossingover (gen almashinuvi) III. O‘sish IV. Differensiallanish (farqlanish) V. Changlanish va urug‘lanish	I va II	I va III	III va V	I, III va IV	D		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-21-media-01.png	I, III, IV va V	t	<div class="imported-question-image"><img src="/uploads/6-ta-variant-maxsus-javobli/variant-03/question-21-media-02.png" alt="Question media" style="max-width:100%;height:auto;" /></div>
154	4	4	Oziq zanjirlardagi 1, 2, 3, 4 – raqamlarga xos tushuncha va organizmlarni aniqlang.	1 – yirtqichlik; 2 – bo'ri; 3 – sichqon; 4 – ukki	1 – hamxo'rak; 2 – yenot; 3 – qo'ng'ir ayiq; 4 –arslon	1 – konkurensiya; 2 – bo'ri; 3 – quyon; 4 –boyqush	1 – antogonistik; 2 – qoplon; 3 – sichqon; 4 –tasqara	C		/uploads/6-ta-variant-maxsus-javobli/variant-04/question-04-media-01.png		t	\N
122	4	22	Rasmdagi o‘simlik bargidan olingan namunadan to‘qima kulturasi usuli orqali yangi o‘simlik yetishtirish jarayoni ko‘rsatilgan. Ushbu jarayonda ona o‘simlikdan yangi o‘simliklar olinayotganda, quyidagi hodisalardan qaysilari sodir bo‘ladi? I. DNA replikatsiyasi (ko'payishi) II. Krossingover (gen almashinuvi) III. O‘sish IV. Differensiallanish (farqlanish) V. Changlanish va urug‘lanish	I va II	I va III	III va V	I, III va IV	D		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-22-media-01.png	I, III, IV va V	t	<div class="imported-question-image"><img src="/uploads/6-ta-variant-maxsus-javobli/variant-03/question-22-media-02.png" alt="Question media" style="max-width:100%;height:auto;" /></div>
123	4	23	Populyatsiyadagi individlar uch guruhga bo'linadi:prereproduktiv,reproduktiv davr va postreproduktivdan individlar. Shunga ko'ra, yuqorida berilgan a, b va c yosh piramidalari berilgan ma'lumotlarga asoslanib o'sib borayotgan populatsiyani aniqlang.	a va b	b va c	c	b	C		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-23-media-01.png		t	\N
124	4	24	Qonning pH qiymati nechaga teng	5,5	1-2 oralig’i	7,4	11-13 oralig’i	C		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-24-media-01.png		t	\N
125	4	25	Qorako'l qo'ylari junining sheroziy rangda bo'lishini ta’minlovchi gen dominant bo'lib, pleyotrop ta’sirga ega.She’roziy qo’ylarning o’zaro chatishishidan olingan qo’ylarning qancha qismini she’roziy qo’zichoqlar tashkil qiladi.	1/3	2/4	1/4	2/3	D		\N		f	\N
126	4	26	Quyidagi grafikda organizmlar (I, II, III, IV, V,VI) tarkibidagi xromosoma yoki DNK sonlari ifodalangan.? Ushbu grafikdan foydalanib, I, II, III, IV, V,VI larga quyidagi qaysi ma’lumotlar mos kelishini aniqlang.? a) diploid navli makkajo‘xori mikrospora hujayralari mitoz bo‘linishining anafaza bosqichi yakunidagi xromosomalar soni; b) tetraploid navli bug‘doy mikrospora hujayralarining mitoz bo‘linishi anafaza bosqichi yakunidagi xromosomalar soni; c) diploid tamaki (n=12) avlodi mikrosporotsit hujayrasining meyoz bo‘linishi metafaza II bosqichidagi xromosoma soni; d) olchaning mikrosporotsit hujayralari meyoz bo‘linishining anafaza II bosqichi yakunidagi DNK soni; e) tog‘olchaning megasporotsit hujayralari meyoz bo‘linishining anafaza I bosqichi yakunida har bir qutbdagi xromosomalar soni; f ) drozofila spermatogenezining yetilish zonasi reduksion bo‘linishi yakunidagi xromosomalar soni	I-e; II-f; III-d; IV-a; V-c; VI-b	I-c; II-f; III-d; IV-e; V-a; VI-b	I-d; II-e; III-b; IV-a; V-c; VI-f	I-e; II-c; III-a; IV-b; V-f; VI-d	A		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-26-media-01.png		t	\N
127	4	27	Quyidagi diagrammada fermentativ reaksiya ko'rsatilgan. Grafiklardagi qaysi o'zgarishlar kuzatilmaydi?	Faqat III	faqat IV	I va III	II va IV	E		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-27-media-01.png	III va IV	t	<div class="imported-question-image"><img src="/uploads/6-ta-variant-maxsus-javobli/variant-03/question-27-media-02.png" alt="Question media" style="max-width:100%;height:auto;" /></div>
128	4	28	Grafikda ko'lda toza holatda va eutrofikatsiya (suvning haddan tashqari ozuqaga to'yinishi) holatida ba'zi jonzotlarning ko'payish tezligi berilgan. Bunga ko'ra: I. Eutrofikatsiya suvo'tlar ko'payishini tezlashtirgan. II. Toza ko'lda baliqlarning ko'payish tezligi parchalovchilarnikidan yuqori. III. Eutrofikatsiya umurtqasiz hayvonlar ko'payishiga salbiy ta'sir ko'rsatgan. Ushbu fikrlardan qaysi biri to’g’ri hisoblanadi.?	Faqat I	I va II	I va III	II va III	E		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-28-media-01.png	I,II va III	t	\N
129	4	29	Davrlarga doir to’g’ri ma’lumotlar berilgan qatorni aniqlang 1),,Qalqondor” baliqlar Devon davrida kelib chiqgan 2)Silur davrida Markaziy Osiyoda kuchli vulqonli jarayonlar ro‘y bergan 3)Toshko’mir davrida uchuvchi hasharot suvaraklar, ninachilar rivojlangan 4)Toshko’mir davrida stegosefallar iqlim tufayli qirilishni boshlagan 5)Yura davrida o‘rmonlarda ochiq urug‘lilar hukmronlik qilgan 6)Trias davrida osmonni qoplagan bulutlar juda kamayib, atmosfera quruq va shaffof bo‘lgan	2,3,5	2,4,5	1,4,6	1,4,5	A		\N		f	\N
130	4	30	Odamalarda karlik retsessiv belgi hisoblanadi va ushbu belgining penantrantligi 40%.Geterozigotali erkak va ayol nikohidan kasal farzandlar tug’ilish ehtimolini aniqlang.	20%	10%	15%	25%	B		\N		f	\N
131	4	31	Grafikda o'ziga xos (maxsus) immunitetning vaqtga bog'liq ravishda o'zgarishi ko'rsatilgan. Shunga ko'ra, quyidagi fikrlardan qaysi biri noto'g'ri?	I raqami antigen bilan ilk bor to'qnash kelishni ko'rsatmoqda.	II raqami birlamchi javobni ifodalaydi.	III raqami aynan o'sha antigen bilan qayta uchrashish holatidir.	IV raqami ikkilamchi javobdir va xotira hujayralari faoldir.	E		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-31-media-01.png	V raqami aynan o'sha antigen bilan uchinchi marta to'qnash kelish holatidir	t	\N
132	4	32	Quyidagi rasmda gen mutatsiyasi ko’rsatilgan unga ko’ra noto’g’ri javobni aniqlang	b-transversiya bo’lib sitozin adeninga aylanadi	b-tranzitsiya bo’lib sitozin timinga aylanadi	a-tranzitsiya bo’lib adenin guaninga aylanadi	b-transversiya bo’lib guanin timinga aylanadi	B		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-32-media-01.png		t	\N
133	4	33	O'simliklarning yilning eng mos vaqtini aniqlash uchun ishlatadigan atrof-muhit signaliga fotoperiod deyiladi. Tungi yoki kunduzgi uzunlikka berilgan fiziologik javob esa fotoperiodizm deb ataladi. Qulupnay va xardal o'simliklarida gullashning boshqarilishi quyida ko'rsatilgan. Bunga ko'ra, quyidagi fikrlardan qaysi biri noto'g'ri?	Qisqa kun o'simliklarida tun uzunligi kritik qiymatdan past bo'lganda gullash sodir bo'lmaydi.	Qisqa kun o'simliklarida tun uzunligi kritik qiymatdan yuqori bo'lsa, o'simlik gullaydi.	Uzun kun o'simliklarida tun uzunligi kritik qiymatdan past bo'lganda gullash sodir bo'ladi, kritik qiymatdan yuqori bo'lganda esa o'simlik gullamaydi.	Uzun kun o'simliklarida tun uzunligi kritik qiymatdan yuqori bo'lsa ham, qorong'u davr yorug'lik bilan bo'linsa (kesilsa), o'simlik gullaydi.	E		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-33-media-01.png	Qisqa kun o'simliklarida qorong'u davr yorug'lik bilan bo'linsa, gullash sodir bo'ladi.	t	\N
134	4	34	Quyidagi grafikda meyoz jarayoni tasvirlangan,unga ko’ra Ⅰ raqamli hujayra genotipi AaBb bo’lsa va bu genlar bitta xromosomada to’liq birikkan holda irsiylansa,genotipi bir xil bo’lgan ikkita hujaryrani aniqlang	Ⅱ va VⅠ	Ⅲ va V	Ⅱ va VⅠ	Ⅲ va VⅡ	D		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-34-media-01.png		t	\N
196	4	46	Ota -onalar yig`ilishida o`qituvchi farzandlarining baholarini ko`rishda kompyuter va axborot texnikalaridan foydalanishni aytib o`tdi o`qituvchi xavfsiz rivjlantiruvchi muhit mehnat vazifasining qaysi ko`nikmalarini bajarmoqda?	Oʻquvchilarda fuqarolik kompetensiyalari va media savodxonligini shakllantirish	Insoniyatni rivojlantirish, oʻqitish va tarbiyalashning klassik va zamonaviy nazariyalarini	Oʻquvchilarga zamonaviy ommaviy axborot vositalari dunyosida xavfsiz ishlashga yordam berish	Shaxslararo va ijtimoiy muloqot jarayonlarini	A		\N		f	\N
197	4	47	O`qituvchi dars davomida mavzuga oid fikrlarni tanqidiy va mantiqiy yo`l bilan hal qilishni aytdi blum taksonomiyasining qaysi bosqichiga to`gri keladi	bilish	qo`llash	sintez	tahlil qilish	D		\N		f	\N
135	4	35	Dulqushlarida (qush turi) dumning uzun bo'lishi aslida uchish qobiliyatini cheklaydi. Shunga qaramay, nima sababdan uzun dumli erkak dulqushlar tanlanishga (seleksiyaga) uchrashi ustida tajriba o'tkazildi. Tajriba uchun ba'zi erkak qushlarning dumi kesilib qisqartirildi, ba'zilariga yangi patlar yopishtirilib uzaytirildi, ba'zilariga esa tegilmadi (normal). So'ngra ular o'z hududlarini himoya qilish va juftlashish uchun erkin qo'yib yuborildi. Har bir erkak qushning hududidagi uya (tuxum yoki polaponli) soni sanalib, quyidagi grafik olindi. Bunga ko'ra, quyidagi xulosalardan qaysilari to’g’ri bo’lishi mumkin? I. Urg'ochi dulqushlar dumi uzun bo'lgan erkaklar bilan juftlashishni afzal ko'radi. II. Dulqushlaridagi jinsiy tanlanish uzun dumli erkaklarning evolyutsiyasini qo'llabquvvatlaydi. III. Kaltadum (qisqa dumli) erkak dulqushlar o'z hududini himoya qilishda muvaffaqiyatliroq bo'lsada, jinsiy tanlanish tufayli kamroq naslga otalik qiladi.	Faqat I	Faqat II	Faqat III	I va III	E		/uploads/6-ta-variant-maxsus-javobli/variant-03/question-35-media-01.png	I, II va III	t	\N
136	4	36	Dars jarayonida o‘qituvchining asosiy vazifasi nima?	O‘quvchilarga bilim berish va baholash	O‘quvchilar bilan mustaqil ish olib borish	O‘quvchilar bilan muloqot qilish	Faqat nazariy materialni tushuntirish	A		\N		f	\N
137	4	37	Quyidagilardan qaysi biri dars turlariga kirmaydi?	Aralash darslar	Bilimlarni mustahkamlash darslari	O‘quvchilar bilan sayohat darslari	Yangi material bilan tanishish darslari	C		\N		f	\N
138	4	38	O‘qituvchining kommunikativ qobiliyatiga qaysi jihatlar kiradi?	Nutq madaniyati, mimika, pantomimika, jest, so‘zlash madaniyati	Faqat jiddiylik	O‘quvchilarga faqat yozma topshiriqlar berish	Faqat auditoriyada dars o‘tish	A		\N		f	\N
139	4	39	Aralash darsda qaysi bosqichlar bo‘lishi mumkin?	Yangi materialni tushuntirish, mustahkamlash, bilimlarni tekshirish, baholash	Faqat yangi materialni o‘rganish	Nazorat ishi va test yechish	Mustaqil ish va darslik bilan ishlash	A		\N		f	\N
140	4	40	Pedagogik omilkorlikning asosiy tarkibiy qismlaridan biri nima?	Faqat nazariy bilimlar	O‘qituvchining shaxsiy qobiliyatlari	Kasbiy bilim, malaka va ko‘nikmalar yig‘indisi	O‘quv dasturining to‘g‘ri tanlanishi	C		\N		f	\N
141	4	41	Kommunikativ nutqning muvaffaqiyatli bo‘lishi uchun quyidagi maxsus qobiliyatlarni qo‘llay olish kerak. Berilganlardan o‘zini boshqara olish qobiliyatining asosiy belgilari qaysilar? 1. O‘z-o‘zini tinchlantirish va og‘ir vaziyatlarda bardavom bo‘lish. 2. Jamiyatdagi bugungi hodisalarni o‘z o'tmish tajribasi bilan bog‘lay olish. 3. Maqsadlarga erishishda qat’iyatli bo‘lish. 4. O‘z hissiy va intellektual holatini anglay olish.	1, 2, 3	2, 3, 4	1, 3, 4	1, 2, 4	C		\N		f	\N
142	4	42	O‘qituvchi ikki o‘quvchi o‘rtasida yuzaga kelgan kelishmovchilikni ko‘rib, ularga: “Iltimos, bu masalani yaxshi niyat bilan hal qilaylik, bir-biringizga imkon bering,” dedi. O‘qituvchi qanday usuldan foydalandi?	Suhbat	Iltimos	Ishontirish	Ogohlantirish	B		\N		f	\N
143	4	43	O‘qituvchi darsda uchburchak va to‘rtburchak shaklidagi qog‘ozni qirqib, o‘quvchilarga ularning xossalarini amaliy ko‘rsatib berdi va tushuntirdi. Ustoz qaysi o‘qitish metodidan foydalandi?	Tushuntirish	Namoyish	Amaliy	Tasvir	B		\N		f	\N
144	4	44	Sinfdosh o‘quvchilar o‘zaro bahslashib, janjallashdi. Bu holat dars jarayonini buzdi. Pedagog nima qilishi kerak?	Bahslashayotganlarni darhol darsdan chiqarib yuborish.	Sinf oldida qattiq tanbeh berish.	Tinchlikni tiklab, suhbatsiz jazo berish.	Suhbat orqali har ikki tomonning fikrini inobatga olib, nizoni adolatli hal qilish.	D		\N		f	\N
145	4	45	Pedagog har bir darsdan oldin dars vaqtini oqilona taqsimlab oladi. Darsning maqsadini aniq belgilaydi, unga mos shakl va usullarni tanlab oladi. Dars davomida o‘quvchilarning faolligini oshirish uchun turli metodlardan foydalanishni rejalashtiradi. Shu orqali dars samaradorligini oshirishga intiladi. Berilgan vaziyatda pedagogning qaysi zaruriy ko'nikmasi aks etgan?	Zamonaviy axborot texnologiyalarini fanga singdirish.	Dars vaqtini oqilona rejalashtirish, darsning maqsad, shakl va usullarni aniqlash	Oʻquvchilarning bilimini baholash natijasida olingan maʼlumotlarni inobatga olgan holda rejalarni muvofiqlashtirish.	Fanlararo kompetensiyalarni fanga singdirish, oʻz fanini boshqa fanlar bilan oʻzaro bogʻlash.	B		\N		f	\N
146	4	46	Ustoz o‘zining dars berish jarayonini diqqat bilan tahlil qiladi. Qaysi metodlari yaxshi natija berganini, qaysi yo‘nalishlarda kamchiliklar borligini aniqlaydi. U kelgusida qanday ko‘nikmalarni rivojlantirish zarurligini belgilab, shunga mos reja tuzadi. Bu ustozning qaysi mehnat harakati turiga misol bo‘la oladi?	Oʻzining taʼlim faoliyatini yetarlicha baholash va kasbiy rivojlanish ehtiyojlarini belgilay olish	Oʻz tajribasini namoyish etish uchun ochiq darslarga tayyorgarlik koʻrish va oʻtkazish.	Oʻzining ish amaliyotida kerakli oʻzgarishlarni amalga oshirish.	Oʻzining taʼlim faoliyatini tahlil qilish va baholash, modifikatsiyani talab qiladigan yoʻnalishlarni aniqlash	A		\N		f	\N
147	4	47	Muayyan oʻquvchining taʼlim olishdagi qiyinchiliklari toʻgʻrisida tegishli soha mutaxassislari bilan maslahatlashish o'qituvchi kasbiy kompetentligining qaysi sohasiga kiradi?	O'quv jarayonini rejalashtirish	Ta'lim samaradorligini taminlash	O'zlashtirishni baholash va qayta aloqani taqdim etish	Hamkasblar va ta'lim oluvchilarning ota-onalari bilan hamkorlik	C		\N		f	\N
148	4	48	O‘quvchidan aylana ichidagi yuzaning o‘lchamini aniqlashda ishlatiladigan asosiy matematik munosabatni aytib berish so‘raldi. U to‘g‘ri aytib berdi. O‘quvchi qaysi bosqichda faoliyat ko‘rsatdi?	Tushunish	Bilish	Qo‘llash	Tahlil	B		\N		f	\N
149	4	49	O'qituvchi to‘g‘ri burchakli uchburchakning katetlari va gipotenuzasi haqida ma'lumot berdi. O‘quvchilar esa ushbu bilimlar asosida o‘zlari mustaqil tarzda Pifagor teoremasini shakllantirib, undan xulosa chiqardilar. So‘ngra o‘qituvchi haqiqiy Pifagor teoremasini bayon etdi. O‘quvchilar o‘zlarining natijalari bilan haqiqiy teoremani taqqoslab, o‘z xatolarini tahlil qildilar. Ushbu jarayon Blum taksonomiyasining qaysi bosqichiga mos keladi?	Bilish	Tushunish	Qo‘llash	Yaratish	D		\N		f	\N
150	4	50	O‘qituvchi va o‘quvchi o‘rtasida sinfdagi muammoli vaziyat haqida suhbat o‘tkazildi. O‘qituvchi o‘quvchining o‘z xatti-harakatini tushuntirishini so‘radi va o‘z firini erkin ifodalashiga imkon berdi. Ushbu vaziyatda nizoni bartaraf etishning qaysi usuli qo‘llanilgan?	Iltimos	Suhbat	Ishontirish	Sud qarori	B		\N		f	\N
151	4	1	Quyda shajarasi berilgan probandning shajarasida qaysi kaslikning irsilanishi berilgan?	Autosomadagi dominant tipidaga kaslik	Autosomadagi retsessiv tipidagi kaslik	X – xromosomaga birikkan dominant tipidagi kaslik	X – xromosomaga birikkan retsessiv tipidagi kaslik	A		/uploads/6-ta-variant-maxsus-javobli/variant-04/question-01-media-01.png		t	\N
152	4	2	Yurak va qon tomir faoliyatiga bir xil ta’sir qilib, qon tomirni toraytirib, bosimni oshiradigan gormonlarni belgilang.	adrenalin - vazopressin	adrenalin - tiroksin	adrenalin - glyukogon	adrenalin - oksitotsin	A		\N		f	\N
153	4	3	Halqali aminokislotalarni aniqlang. 1) Sistein; 2) Lizin; 3) Gistidin; 4) Sistin; 5) Arginin; 6) Prolin; 7) Metionin; 8) Asparagin kislota; 9) Oksiprolin;	2,3,4;	6,9,3;	5,7,8;	1,6,2;	B		\N		f	\N
155	4	5	Bir kunlik iste’mol qilingan ozuqaning organizmda ishlatilishi quyidagicha: Bunda oqsil va uglevoddan hosil bo’lgan energiya jami dissimilatsiyadan hosil bo’lgan energiyaning necha % ni tashkil etadi?	35,8;	60;	50,33;	30,6;	B		\N		t	<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;border:none;mso-border-left-alt:1.0000pt solid windowtext;\nmso-border-top-alt:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;mso-border-bottom-alt:1.0000pt solid windowtext;\nmso-border-insideh:1.0000pt solid windowtext;mso-border-insidev:1.0000pt solid windowtext;mso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr><td width="185" valign="center" style="width:92.9000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Ozuqa</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="185" valign="center" style="width:92.9000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Katabolizm</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="185" valign="center" style="width:92.9000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Anabolizm</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="185" valign="center" style="width:92.9000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,255,255);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Oqsil(100g)</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="185" valign="center" style="width:92.9000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,204);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">40%</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="185" valign="center" style="width:92.9000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,204);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">60%</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="185" valign="center" style="width:92.9000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,255,255);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Yog’(100g)</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="185" valign="center" style="width:92.9000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,204);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">100%</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="185" valign="center" style="width:92.9000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,204);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">0%</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="185" valign="center" style="width:92.9000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,255,255);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Uglevod(500g)</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="185" valign="center" style="width:92.9000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,204);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">60%</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="185" valign="center" style="width:92.9000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,204);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">30%</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr></tbody></table></body></html>
156	4	6	Quyda shajarasi berilgan probandning shajarasida qaysi kaslikning irsilanishi berilgan?	Y – xromosomaga birikkan kaslik	Sitoplazmatik irsiylanishga oid kasalik	X – xromosomaga birikkan dominant tipidagi kaslik	X – xromosomaga birikkan retsessiv tipidagi kaslik	A		/uploads/6-ta-variant-maxsus-javobli/variant-04/question-06-media-01.png		t	\N
157	4	7	Modifikatsion o’zgaruvchanlikka xos xususiyatlarni aniqlang. 1) dominant yoki retsessiv xarakterga ega; 2) irsiylanmaydi; 3) irsiylanadi;4) o’zgaruvchanlik chegaralari genotip bilan aniqlanishi; 5) belgilarning o’zgarishlari chegaralanmagan; 6) guruhli xarakterga ega;	4, 6;	1, 3;	2, 5;	5, 6;	A		\N		f	\N
158	4	8	O’simlik navlari va ularga xos xususiyatlar to’g’ri ko’rsatilgan javobni aniqlang.	1, 4, 5;	2, 4, 3;	2, 3, 1;	4, 5, 2;	D		\N		t	<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;margin-left:5.4000pt;border:none;\nmso-border-left-alt:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;mso-border-insideh:1.0000pt solid windowtext;mso-border-insidev:1.0000pt solid windowtext;\nmso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr style="height:14.4000pt;"><td width="42" valign="center" style="width:21.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">1</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="170" valign="center" style="width:85.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><font face="Calibri">“Sanzor”</font></span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="349" valign="center" style="width:174.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Ostki gulkosacha ega</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:14.4000pt;"><td width="42" valign="center" style="width:21.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">2</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="170" valign="center" style="width:85.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><font face="Calibri">“Umid”</font></span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="349" valign="center" style="width:174.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Chanchilari qo’shilib urug’chini o’rab turadi</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:14.4000pt;"><td width="42" valign="center" style="width:21.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">3</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="170" valign="center" style="width:85.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><font face="Calibri">“Omad”</font></span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="349" valign="center" style="width:174.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Hayotiy shakli daraxt</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:14.4000pt;"><td width="42" valign="center" style="width:21.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">4</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="170" valign="center" style="width:85.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><font face="Calibri">“Qozi dastor”</font></span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="349" valign="center" style="width:174.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">oddiy qalqonsimon to’pgulga ega</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:14.4000pt;"><td width="42" valign="center" style="width:21.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">5</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="170" valign="center" style="width:85.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><font face="Calibri">“Nimrang”</font></span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="349" valign="center" style="width:174.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,102);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Gultojibargi qo’shilib nay hosil qiladi</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr></tbody></table></body></html>
159	4	9	Prionlar — turli hayvon turlarida ba’zi miya degeneratsiyalariga sabab bo‘ladigan oqsillardir. Bu molekulalar Yevropa go‘sht sanoatiga katta zarar yetkazgan deli dana kasalligi va so‘nggi o‘n yilda Angliyada 150 ga yaqin odamning o‘limiga sabab bo‘lgan Creutzfeldt-Jakob kabi kasalliklarga olib keladi. Quyida bu molekulalarning ko‘payish modeli berilgan. Ushbu modelga ko‘ra, prionlar quyidagi usullardan qaysi biri natijasida yuzaga keladi? I. DNKdagi nukleotid ketma-ketligining o‘zgarishi (mutatsiya) II. Oqsil sintezi paytida noto‘g‘ri aminokislotaning zanjirga qo‘shilishi III. Mavjud prionning, shu turdagi sog‘lom oqsilga tegib, uning tuzilishini o‘zgartirishi	Faqat I	Faqat II	Faqat III	I va II	C		/uploads/6-ta-variant-maxsus-javobli/variant-04/question-09-media-01.png	II va III	t	\N
160	4	10	Nuqtalar o'rniga mos javobni tanlang. 1) Moskovka chittak ……. 2) Lazorevka chittak ……. 3) Kokkilchali chittak ……..	1 – hashoratlar tuxumlari bilan oziqlanadi; 2 – daraxt, butalar po'stlog'i orasidagi mayda hashoratlar bilan oziqlanadi; 3 – o'simlik urug'lari bilan oziqlanadi.	1 – bog'larda yirik hashoratlar bilan oziqlanadi; 2 – hashoratlar tuxumlari va qurtlari bilan oziqlanadi; 3 – daraxt, butalar po'stlog'i orasidagi mayda hashoratlar bilan oziqlanadi.	1 – hashoratlar tuxumlari va qurtlari bilan oziqlanadi; 2 – bog'larda yirik hashoratlar bilan oziqlanadi; 3 – o'simlik urug'lari bilan oziqlanadi.	1 – o'simlik urug'lari bilan oziqlanadi; 2 – daraxt, butalar po'stlog'i orasidagi mayda hashoratlar bilan oziqlanadi; 3 – hashoratlar qurtlari bilan oziqlanadi.	A		\N		f	\N
161	4	11	Quyidagi grafikda homilador ayol qonidagi estrogen va progesteron gormonlari miqdorining oylar bo‘yicha o‘zgarishi ko‘rsatilgan. Ushbu grafik asosida quyidagi mulohazalardan qaysilari qilish mumkin? I. Tug‘ruq paytida qondagi progesteron miqdori estrogen miqdoridan ko‘proq. II. Homiladorlik davomida qondagi estrogen va progesteron miqdori ortadi. III. Homilador bo‘lmagan ayol qonida estrogen gormoni mavjud bo‘lmaydi.	Faqat I	Faqat II	I va II	II va III	B		/uploads/6-ta-variant-maxsus-javobli/variant-04/question-11-media-01.png	I, II va III	t	\N
162	4	12	Plazmidlar (a) va transpozonlar (b) uchun xos xususi-yatlarni ko‘rsating. 1) tuban eukariotlar hujayralaridagi qo‘shimcha xromoso-malar; 2) ko‘chib yuruvchi genetik elementlardir; 3) o‘simlik va hayvon hujayralarida topilgan; 4) DNK molekulasini yopishqoq uchlar hosil qilib kesuvchi ferment geniga ega; 5) monomeri nukleotidlardan iborat; 6) zaharli toksinni parchalovchi ferment geniga ega	a - 3, 5, 6; b - 1, 4, 5	a - 1 ,2 , 6; b - 3, 4, 5	a - 4, 5, 6; b - 1, 3, 5	a - 1, 5, 6; b - 2, 3, 4	D		\N		f	\N
163	4	13	Quyida keltirilgan hayvonlar nechta tipga (a) va nechta sinfga (b) tegishli? 1) jigar qurti; 2) ildizog’iz meduza; 3) qoramol tasmasimon chuvalchangi; 4) qizil chuvalchang; 5) nereida; 6) krevetka; 7) biy; 8) iskabtopar; 9) latimeriya; 10) beluga	а–5; b–9;	а–6; b–10;	а–5; b–10;	а–9; b–10;	A		\N		f	\N
164	4	14	Moddalar almashinuvi bosqichlari va ularga xos jarayonlar o’rtasidagi muvofiqlikni aniqlang. 1) fotosintezning yorug’lik bosqichi; 2) energiya almashinuvining tayyorgarlik bosqichi; 3) translyatsiya; а) ATF sintezi; b) t-RNKning aminokislota bilan bog’lanishi; с) polimerlarning monomerlarga parchalanishi; d) DNK sintezi	1 – а, 2 – с, 3 – b ;	1 – с, 2 – а, 3 – b;	1 – а, 2 – с, 3 – d;	1 – d, 2 – а, 3 – b.	A		\N		f	\N
165	4	15	Quyida berilgan tushunchalar va ularning tavsifi o’rtasidagi muvofiqlikni aniqlang. 1) alohidalanish; 2) mikroevolyutsiya; 3) divergensiya; 4) konvergensiya; 5) aromorfoz. а) kenja tur va turlarning paydo bo’lishi; b) sinf, tip darajasida yuzaga keladigan tuzilishning yuksalishi bilan bog’liq evolyutsion o’zgarishlar; c) bir ajdoddan tarqalgan organizmlarning turli muhitda yashashi tufayli belgi-xossalarining bir-biridan farqlanishi; d) bir turga mansub individlarning erkin chatishuvini cheklovchi to’siq.	1 – d; 2 – а; 3 – с; 5 – b;	1 – c; 2 – b; 3 – с; 5 – а;	1 – d; 2 – b; 4 – с; 5 – а;	1 – d; 2 – а; 4 – с; 5 – b;	A		\N		f	\N
198	4	48	O`quvchi gumanitar fanlardan tushunadi lekin doskaga chiqib gapirishga qo`rqadi hayajonlanadi ushbu vaziyatda o`qituvchi qanday yo`l tutadi	ota-onasini chaqirib suhbat o`tkazadi	hayajonlanmasligi uchun doskaga umuman chiqarmaydi	psixolog bilan gaplashadi	hamkasblari bilan muxokama qiladi	C		\N		f	\N
166	4	16	Berilgan ma’lumotlar orasidan rasmda berilgan hayvonlar uchun uchta umumiy xususiyatni aniqlang. 1) umurtqa pog’onasi va qovurg’alar 2) jabralar orqali nafas olish 3) bosh va orqa miya 4) ikki kamerali yurak 5) yopiq qon aylanish doirasi 6) issiqqonlilik	2,5;	1,2,5	1, 3, 5;	3,5,6;	C		\N		t	<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;width:268.7500pt;margin-left:5.4000pt;\nborder:none;mso-border-left-alt:0.5000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;\nmso-border-right-alt:0.5000pt solid windowtext;mso-border-bottom-alt:0.5000pt solid windowtext;mso-border-insideh:0.5000pt solid windowtext;\nmso-border-insidev:0.5000pt solid windowtext;mso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr style="height:24.9500pt;mso-row-margin-right:11.1000pt;"><td width="245" valign="top" rowspan="6" style="width:122.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><img width="151" height="123" src="/uploads/6-ta-variant-maxsus-javobli/variant-04/question-16-media-01.png"></span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td><td width="291" valign="top" rowspan="6" style="width:145.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><img width="180" height="109" src="/uploads/6-ta-variant-maxsus-javobli/variant-04/question-16-media-02.png"></span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td><td style="mso-cell-special:placeholder;border:none;border-bottom:1.0000pt outset windowtext;" width="22"><p></p></td></tr><tr style="height:21.9500pt;"><td valign="center" style="padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt outset windowtext;mso-border-left-alt:0.7500pt outset windowtext;\nborder-right:1.0000pt outset windowtext;mso-border-right-alt:0.7500pt outset windowtext;border-top:1.0000pt outset windowtext;\nmso-border-top-alt:0.7500pt outset windowtext;border-bottom:1.0000pt outset windowtext;mso-border-bottom-alt:0.7500pt outset windowtext;"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td></tr><tr style="height:21.9500pt;"><td valign="center" style="padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt outset windowtext;mso-border-left-alt:0.7500pt outset windowtext;\nborder-right:1.0000pt outset windowtext;mso-border-right-alt:0.7500pt outset windowtext;border-top:none;\nmso-border-top-alt:0.7500pt outset windowtext;border-bottom:1.0000pt outset windowtext;mso-border-bottom-alt:0.7500pt outset windowtext;"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td></tr><tr style="height:21.9500pt;"><td valign="center" style="padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt outset windowtext;mso-border-left-alt:0.7500pt outset windowtext;\nborder-right:1.0000pt outset windowtext;mso-border-right-alt:0.7500pt outset windowtext;border-top:none;\nmso-border-top-alt:0.7500pt outset windowtext;border-bottom:1.0000pt outset windowtext;mso-border-bottom-alt:0.7500pt outset windowtext;"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td></tr><tr style="height:21.9500pt;"><td valign="center" style="padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt outset windowtext;mso-border-left-alt:0.7500pt outset windowtext;\nborder-right:1.0000pt outset windowtext;mso-border-right-alt:0.7500pt outset windowtext;border-top:none;\nmso-border-top-alt:0.7500pt outset windowtext;border-bottom:1.0000pt outset windowtext;mso-border-bottom-alt:0.7500pt outset windowtext;"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td></tr><tr style="height:21.9500pt;"><td valign="center" style="padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt outset windowtext;mso-border-left-alt:0.7500pt outset windowtext;\nborder-right:1.0000pt outset windowtext;mso-border-right-alt:0.7500pt outset windowtext;border-top:none;\nmso-border-top-alt:0.7500pt outset windowtext;border-bottom:1.0000pt outset windowtext;mso-border-bottom-alt:0.7500pt outset windowtext;"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td></tr><tr style="height:9.8000pt;"><td width="245" valign="top" style="width:122.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">1</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="291" valign="top" style="width:145.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">2</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td valign="center" style="padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;mso-border-left-alt:none;\nborder-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;border-top:1.0000pt solid windowtext;\nmso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;mso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td></tr></tbody></table></body></html>
167	4	17	Quyida uch xil muhitga joylashtirilgan qizil qon tanachalarida yuzaga kelgan o‘zgarishlar ko‘rsatilgan. Diagrammaga ko‘ra alyuvar hujayralari haqida quyidagi mulohazalardan qaysilari to‘g‘ridir? I. Izotonik muhitda suv almashinuvi sodir bo‘lmaydi. II. Gipertonik muhitda ularning hajmi ortadi. III. Gipotonik muhitda ular suv qabul qilib yoriladi.	Faqat III	I va II	I va III	II va III	A		/uploads/6-ta-variant-maxsus-javobli/variant-04/question-17-media-01.png	I, II va III	t	\N
168	4	18	Nukleotid 4 7 10 13 16 19 22 Gen ATG GCT GGC AAT CAA CTA TAT TAG i-RNK UAC CGA CCG UUA GUU GAU AUA AUC Quyidagi keltirilgan mutatsiyalardan qaysilari eng qisqa oqsil hosil bo’lishiga olib keladi?	7-nukleotidning tranzitsiyasi	9-nukleotidning transversiyasi	4-nukleotidning tranzitsiyasi	18-nukleotidning tranversiyasis	D		\N		f	\N
169	4	19	Chala dominantlikda Aa genotipli o`simlik o`zidan changlanishi natijalariga oid to`g`ri ma`lumotlarni aniqlang. 1) avlodning 75% ini retsessiv belgili organizmlar tashkil etadi; 2) fenotip bo`yicha nisbat 3:1 bo`ladi; 3) belgilarning ajralish hodisasi kuzatiladi; 4) genotip bo`yicha nisbat 1:2:1 ni tashkil etadi; 5) avlodning 25% dominant belgiga ega.	3,4;	1,2;	3,5;	4,5.	C		\N		f	\N
170	4	20	Quyidagi atamalarni ularga mos keluvchi ta’riflar bilan 1) turgor; 2) plazmoliz; 3) deplazmoliz; 4) buferlik; a) vakuolaga suv kirib, hujayraning tarangligini saqlashi; b) hujayra tarangligining yo'qolishi; c) tarangligi yo'qolgan hujayraning toza suvda o'z holatiga qaytishi; d) hujayraning kuchsiz ishqoriy holatni saqlab turishi	1-d; 2-c; 3-h; 4-a	1-a; 2-b; 3-c; 4-d	1-b; 2-c; 3-d; 4-a	1-е; 2-d; 3-a; 4-b	B		\N		f	\N
171	4	21	Bir yillik(a) va ko’p yillik(b) guli qiyshiq o’simliklarni aniqlang? 1) rayhon; 2) beda; 3) lola; 4) yeryong’oq; 5) shirinmiya 6) na’matak; 7) sebarga; 8) loviya; 9) kiyiko’t; 10) no’xot	a-6,7,9,3; b-2,10,4	a-8,10,4,1; b-6,3,9	a-2,1,10; b-3,9,6	a-8,1,4; b-9,7,5	D		\N		f	\N
172	4	22	Quyidagi jadvalga mos keluvchi javobni aniqlang.	a-Bo’yi 150–160 sm; b-Kromanyon	c-Bo’yi 155–165 sm; d- Avstralopitek	e-Kalla suyagining hajmi 500–600 sm3; b-Neandertal;	a-Bo’yi 120–140 sm; d- Homo habilis	A		\N		t	<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;width:277.6000pt;border:none;\nmso-border-left-alt:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;mso-border-insideh:1.0000pt solid windowtext;mso-border-insidev:1.0000pt solid windowtext;\nmso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr style="height:16.6500pt;"><td width="382" valign="center" style="width:191.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,176,240);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Odam ajdodlarining xususiyatlari</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="172" valign="center" style="width:86.4500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,176,240);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Odam ajdodi</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td></tr><tr style="height:10.6000pt;"><td width="382" valign="center" style="width:191.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Miyasining hajmi 800–1100 sm</span><sup><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;vertical-align:super;">3</span></sup><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="172" valign="center" style="width:86.4500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Pitekantrop</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:7.0000pt;"><td width="382" valign="center" style="width:191.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">A</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="172" valign="center" style="width:86.4500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Sinantrop</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:10.6000pt;"><td width="382" valign="center" style="width:191.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Miyasining hajmi 1600 sm</span><sup><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;vertical-align:super;">3</span></sup><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="172" valign="center" style="width:86.4500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">b</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:7.0000pt;"><td width="382" valign="center" style="width:191.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">C</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="172" valign="center" style="width:86.4500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Neandertal</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:7.0000pt;"><td width="382" valign="center" style="width:191.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Bo’yi 135–150 sm.</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="172" valign="center" style="width:86.4500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">d</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:14.0500pt;"><td width="382" valign="center" style="width:191.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">E</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="172" valign="center" style="width:86.4500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Avstralopitek</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr></tbody></table></body></html>
173	4	23	Jadvalning qaysi qatoriarida (№) organizmlar va ular-ning rudiment organlari va ular mansub turkumlar muvofiq tarzda berilgan?	1, 4, 5;	2, 3, 4;	1, 3, 5;	1, 2, 5;	C		\N		t	<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;mso-table-layout-alt:fixed;border:none;\nmso-border-left-alt:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;mso-border-insideh:1.0000pt solid windowtext;mso-border-insidev:1.0000pt solid windowtext;\nmso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr style="height:5.5500pt;"><td width="50" valign="center" style="width:25.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><font face="Calibri">№</font></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="235" valign="center" style="width:117.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Rudiment organ</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="125" valign="center" style="width:62.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Organizm</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="144" valign="center" style="width:72.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Turkum</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td></tr><tr style="height:8.3000pt;"><td width="50" valign="center" style="width:25.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">1</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="235" valign="center" style="width:117.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Ikkinchi va to’rtinchi barmoqlari</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="125" valign="center" style="width:62.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Vladimir</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="144" valign="center" style="width:72.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Toq tuyoqlila</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:8.3000pt;"><td width="50" valign="center" style="width:25.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">2</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="235" valign="center" style="width:117.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Dumg’aza va orqa oyoq suyaklari</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="125" valign="center" style="width:62.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Kivi</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="144" valign="center" style="width:72.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Tuyaqush</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:5.5500pt;"><td width="50" valign="center" style="width:25.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">3</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="235" valign="center" style="width:117.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Bir juft kichik qanotlar</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="125" valign="center" style="width:62.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Bo’ka</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="144" valign="center" style="width:72.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Ikki qanotlilar</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:5.5500pt;"><td width="50" valign="center" style="width:25.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">4</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="235" valign="center" style="width:117.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Qanot skeleti suyaklari</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="125" valign="center" style="width:62.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Poliksina</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="144" valign="center" style="width:72.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Tangacha-</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">qanotlilar</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:5.5500pt;"><td width="50" valign="center" style="width:25.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">5</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="235" valign="center" style="width:117.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Uchinchi qovoq</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="125" valign="center" style="width:62.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Odam</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="144" valign="center" style="width:72.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Primat</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr></tbody></table></body></html>
174	4	24	Kiprikli chuvalchanglarning parazit yashashga moslash-gan vakillaridan so’rg’ichlilar hamda tasmasimon chuval-changlarning kelib chiqishi (a), yettisoy, murg’ob, xiva qir-g’ovul kenja turlarining paydo bolishi (b), xaltali krot va oddiy krot tashqi qiyofasining o’zaro o’xshashligi (c) qaysi biologik hodisalarni aks ettiradi?	a-divergensiya; b-makroevolutsiya; с- konvergensiya	a-mikroevolutsiya; b- divergensiya; с-makroevolutsiya	a-mikroevolutsiya; b-makroevolutsiya; с-divergensiya	a-makroevolutsiya; b-mikroevolutsiya; с-konvergensiya	C		\N		f	\N
175	4	25	Xordalilar tipining evolutsiyasida aromorfozlarning paydo bolish ketmaketligini aniqlang. 1) miya yarimsharining po’stlog’ida ilonizi burmalar; 2) o’pka devorining ko’plab katakchalarga bo’linganligi; 3) katta va kichik qon aylanish doiralari; 4) nerv nayi; 5) ikki kamerali yurak.	4, 3, 2, 5, 1	4, 3, 5, 1, 2	4, 5, 3, 2, 1	5, 4, 2, 3, 1	C		\N		f	\N
176	4	26	5-raqam bilan nima tasvirlangan	ikkinchi tartib qoqish pat	par	birinchi tartib qoqish pat	momiq pat	A		/uploads/6-ta-variant-maxsus-javobli/variant-04/question-26-media-01.png		t	\N
177	4	27	Rasmda tasvirlangan 1 – 2 – o'simlikning umumiy shakli o'zgargan vegetativ organi nomi va o'simlik turlari to'g'ri berilgan javobni aniqlang.	shakli o'zgargan yer ustki novda; 1–zirk; 2–tok	shakli o'zgargan yer ostki novda;1–yantoq; 2–no'xat	shakli o'zgargan yer ustki barg; 1–akatsiya; 2–tok	shakli o'zgargan novda ; 1–do'lana; 2–tok	D		/uploads/6-ta-variant-maxsus-javobli/variant-04/question-27-media-01.png		t	\N
178	4	28	Quyidagi jadvalda Hayotning tuzilish darajasi berilgan, bo'sh katakni tegishli atama bilan to'ldiring.	hujayra	organ	populyatsiya	organizm	D		\N		t	<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;margin-left:6.7500pt;margin-right:6.7500pt;\nborder:none;mso-border-left-alt:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;\nmso-border-right-alt:1.0000pt solid windowtext;mso-border-bottom-alt:1.0000pt solid windowtext;mso-border-insideh:1.0000pt solid windowtext;\nmso-border-insidev:1.0000pt solid windowtext;mso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr style="height:5.8000pt;"><td width="210" valign="center" style="width:105.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(11,253,17);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Tuzilish darajasi</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="277" valign="center" style="width:138.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(11,253,17);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">tushuncha</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:2.9000pt;"><td width="210" valign="center" style="width:105.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(255,192,0);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Biogeotsenoz</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="277" valign="center" style="width:138.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(255,192,0);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Oziq zanjiri.</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:1.4500pt;"><td width="210" valign="center" style="width:105.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(255,192,0);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">?</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="277" valign="center" style="width:138.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(255,192,0);"><p class="MsoNormal" style="margin-bottom:8.0000pt;line-height:115%;"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">gumoral boshqarilishi</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr></tbody></table></body></html>
179	4	29	Odam organizmi kichik qon aylanish doirasi arteriyalari….. a) yurakdan qon olib ketadi; b) yurakka qon olib keladi; c) karbonat angidridga to`yingan qon tashiydi; d) kislorodga to`yingan qon tashiydi; e) o`pkalarga boradi; f) o`pkalardan keladi.	а,c,e;	b,d,e;	а,c,f;	а,d,e;	C		\N		f	\N
180	4	30	Quyidagi jadvalda, albinizm xususiyatiga ko‘ra tashuvchi bo‘lgan ona va otadan tug‘ilishi mumkin bo‘lgan farzandlarining genotiplari va fenotiplari keltirilgan. Jadvalga ko‘ra, quyidagi mulohazalardan qaysilari to‘g‘ridir? I. Albinizm bo‘lgan odamda “A” geni mavjud bo‘lmaydi. II. Albinizm bo‘lmagan ona va otaning albinizm farzandi bo‘lishi mumkin. III. Normal (oddiy ko‘rinishda) bo‘lgan odamda “a” geni mavjud bo‘lmaydi.	Faqat II	I va II	I va III	II va III	B		/uploads/6-ta-variant-maxsus-javobli/variant-04/question-30-media-01.png	I, II va III	t	\N
181	4	31	Organizmlar va ularga xos moslanish turi to’g’ri juftlangan qatorni aniqlang.	2i,5j,8a	1k,4j,6e	1k,5g,8i	2b,3h,10i	B		/uploads/6-ta-variant-maxsus-javobli/variant-04/question-31-media-01.png		t	\N
182	4	32	Organizmlar va ularga xos moslanish turi to’g’ri juftlangan qatorni aniqlang.	2i,5j,8a	1k,4j,6e	1k,5g,8i	2b,3h,10i	B		/uploads/6-ta-variant-maxsus-javobli/variant-04/question-32-media-01.png		t	\N
183	4	33	Quyidagi rasmda K,L,M organizmlari o’rtasidagi + belgisi foydali munosabatni, – belgisi esa zararli munosabatni ifodalaydi. Bunga ko’ra K-L va L-M organizmlari o’rtasidagi to’g’ri munosabatni aniqlang K-L L-M	K-L parazitizm L-M mutualizm	K-L mutualizm L-M kommensalizm	K-L kommensalizm L-M parazitizm	K-L parazitizm L-M kommensalizm	B		/uploads/6-ta-variant-maxsus-javobli/variant-04/question-33-media-01.png		t	\N
184	4	34	Funariyaning jinsiy bo’g’mi uchun mos kelmaydigan javobni aniqlang. 1) sporadan rivojlanadi; 2) sporofit hisobiga rivojlanadi; 3) har bir arxegoniyda bir necha tuxum hujayralar yetiladi; 4) arxegoniysi bir hujayrali; 5) poya-bargli o’simlik; 6) yashil ip hosil qiladi; 7) spora hosil qiladi.	3, 4	5, 7	1 ,6	3, 6	A		\N		f	\N
185	4	35	Atamalar va ularga xos xususiyatlar to'g'ri juftlangan javobni aniqlang.	2J,5D,9H,10I	1K,4F,6A,8E	2J,6G,8E,10I	3B,5D,7A,9K	C		/uploads/6-ta-variant-maxsus-javobli/variant-04/question-35-media-01.png		t	\N
186	4	36	Pedagogik ijodkorlik" qismlarini toping 1. Darsda kutilmagan vaziyatlarga moslashish va yangi yechim topish 2. Muammolarni tahlil qilish, o‘ziga xos usullar ishlab chiqish 3. O‘quv rejalari, dasturlar va tarbiyaviy loyihalar ishlab chiqish 4. Bolalar uchun teatr sahnasida rol o`ynash	1,2,4	1,2,3,4	1,2,3	2,3,4	C		\N		f	\N
187	4	37	Oquvchilar orasida nizo kelib chiqqanda òqituvchi sabab va oqibatlarini aytib berdi, muloyimlik bilan tushuntirib nizoni bartaraf qildi bu qaysi usul	iltimos	tushuntirish	suhbat	kuch bilan bostirish	B		\N		f	\N
188	4	38	Tushuncha — umumiy qoidadan alohida holatlarga xulosa chiqarish va uni qo‘llash usuli. Ijobiy tomonlari: Bilimlarni tez va tartibli shaklda o‘rgatishga imkon beradi. Aniq va mantiqiy fikrlashni shakllantiradi. O‘quvchilar tayyor bilim asosida xatolarga kamroq yo‘l qo‘yadi. Salbiy tomonlari: O‘quvchilarning mustaqil fikrlash va kashf etish imkoniyatini cheklaydi. Tayyor bilimni yod olishga olib kelishi mumkin, mavzuni chuqur anglashmaydi. Darslar faqat qoidalar va formulalar atrofida quruq va zerikarli bo‘lib qolishi ehtimoli bor.	induksiya	deduksiya	analogiya		B		\N		f	\N
189	4	39	Tushuncha — xulosaga alohida holatlardan umumiy qoidaga kelish usuli. Ijobiy tomonlari: O‘quvchilarning mustaqil fikrlashini rivojlantiradi. Tajriba va kuzatuvlarga asoslanadi, shuning uchun o‘quvchilarning o‘zlari kashf qilish hissi kuchayadi. Mavzuni chuqurroq tushunishga yordam beradi. Salbiy tomonlari: Vaqt ko‘p talab qiladi. Barcha o‘quvchilar bir xil tezlikda fikr yuritmasligi mumkin.	induksiya	deduksiya	analogiya		A		\N		f	\N
190	4	40	Irodaviy ta’sir ko‘rsatish jihatlarini aniqlang 1. Qat’iyatlilik 2. Talabchanlik 3. Sabrlilik . 4. O‘ziga ishonch 5. Namunaviy xulq 6. Tizimli yondashuv 7. Motivatsion ta’sir 8. Doimo rivojlanish	1,2,3,4,5,6,7,8	1,3,4,5,6,7,8	1,2,3,4,5,6,7	1,2,4,5,6,7	C		\N		f	\N
191	4	41	Oʻqituvchi doimiy ravishda oʻquvchilarda mustaqil fikrlash va kognitiv qobiliyatini oshiradi, darslarda va jamoaviy ishlarda faol qatnashishga undaydi. Bu holat oʻqituvchining qaysi kasbiy mehnat vazifasiga mos keladi?	Ta’lim jarayonini loyihalash	Ta’lim jarayonini tashkil etish	Ta’lim sifatini monitoring qilish va baholash	Oʻquvchilar bilan psixologik-pedagogik ishlarni olib boorish	B		\N		f	\N
192	4	42	O‘qituvchi elektr zanjirining ishlashini sxema asosida tushuntirib, uning elementlarini chizmada ko‘rsatib berdi. Bu qaysi metod hisoblanadi?	Tasvir	Tushuntirish	Ilyustratsiya	Hikoya	A		\N		f	\N
193	4	43	Oʻqituvchi oʻz oldiga bolalarga odob-axloqni aniq oʻrgataman deb maqsad qoʻydi bu tarbiyaning qaysi tamoyiliga kiradi	Tarbiyaning aniqligi	Tarbiyaning uzluksizligi	Tarbiyani rejalashtirish	Tarbiyaning maqsadga yoʻnaltirilganligi	D		\N		f	\N
194	4	44	Oʻqituvchi dars jarayonida dars mavzusining koʻpligini hisobga olib uning har bir etapiga alohida ahamiyat qaratdi va koʻproq gapirishga tushuntirishga eʼtibor berdi Bunda qaysi metoddan foydalandi	amaliy metod	suhbat metodi	namoyish	ma’ruza	D		\N		f	\N
195	4	45	Bu pedagog har darsning boshida o‘quvchilar bilan birgalikda sinf ichida hurmat va hamkorlik qoidalarini eslab o‘tadi. Ularni bir-birini hurmat qilishga undaydi va bu holatni o‘zining harakatlari bilan namoyon qiladi. Jamoa bo‘lib erishgan yutuqlarini mustahkamlash uchun kichik tadbirlar tashkil etadi. Nima maqsadda o‘qituvchi o‘quvchilar bilan bunday muloqotga kirishishni xohlaydi?	O‘quvchilarning intizomini kuchaytirish uchun	Butun o‘quvchilar jamoasi bilan yaxlit o‘zaro ijobiy munosabat tashkil etish	Fan materialini osonroq tushuntirish uchun	O‘quvchilarni baholashni yengillashtirish uchun	B		\N		f	\N
208	4	8	Quyidagi grafiklarda X, Y va Z ozuqa moddalarining hazm qilish organlaridagi miqdorining o'zgarishi berilgan. Ushbu grafiklardan kelib chiqib, X, Y va Z ozuqalari haqidagi quyidagi juftliklardan qaysi biri noto'g'ri?	X - Go'sht	Y - Sariyog'	Z Guruch	X – Sut	E		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-08-media-01.png	Z - Tuxum oqi	t	\N
199	4	49	Matematika fani o'qituvchisi o'quvchilarga merilgan misol va masalalarni tez va to'g'ri bajarishni shakllantirish maqsadida taymer qo'yib ishlashga o'rgatdi va har biriga alohida dars vazifa berdi. Bunda o'qituvchining qanday zarur ko'nikmalari namoyon bo'lmoqda?	Taʼlimning aniq va oʻlchanadigan natijalarini, shuningdek ushbu natijalarga erishishda aniq muddatlar uchun vazifalarni aniqlash va ularni rejalarda shakllantirish.	Oʻquvchilarning bilimini baholash natijasida olingan maʼlumotlarni inobatga olgan holda rejalarni muvofiqlashtirish.	Fanlararo kompetensiyalarni fanga singdirish, oʻz fanini boshqa fanlar bilan oʻzaro bogʻlash (korrelyatsiya).	Zamonaviy axborot texnologiyalarini fanga singdirish.	A		\N		f	\N
200	4	50	Xalqimizda "Bir bolaga yetti mahalla ota-ona" degan naql bor. Buning ma'nosi bolaga faqat maktab ustozlari emas, balki oila, mahallada birdek olib borilishi kerak. Shaxsning shakllanishiga ta'sir etuvchi oila,maktab, do'stlar va tengqurlar davrasini o'z ichiga oluvchi mikromuhitning tarbiyaviy jarayonda ta'siri beqiyosdir. Bunda tarbiyaning qanday jarayon ekanligi namoyon bo'lmoqda?	obyekt va sub’yektning o`zaro munosabati	tarbiyaviy reja asosida tarbiyalashning bir maqsadga yo`naltirilganligi	uzluksiz faoliyatli tarbiyaviy jarayon	guruh jamoasida norasmiy yetakchining xatti-harakati va xulq-atvori bilan tarbiyalash	B		\N		f	\N
201	4	1	Inson tanasida hazm qilingan oziq moddalarning qon va limfa aylanishiga o’tish yo'llari quyidagi diagrammada ko'rsatilgan. Shunga ko'ra, sxemadagi 1 va 2 raqamli yo'llar bilan tashiladigan molekulalar quyidagilarning qaysinisida to'g'ri juftlangan?	1 – glyukoza; 2 – fruktoza	1 – yog’ kislota; 2 – glitserin	1 – D vitamini; 2 – C vitamini	1 – fruktoza; 2 – aminokislota	E		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-01-media-01.png	1 – galaktoza; 2 – yog’ kislotasi	t	\N
202	4	2	Quyidagi rasmda tinch holatidagi bir insonning yurak sikli quyida ko'rsatilgan.? Bunga ko'ra, qaysi fikrlar to’g’ri hisoblanadi: I. Bir sikl davomida bo'lmachalar 0,7 s davomida bo'shashgan holatda bo'ladi; II. a bosqichida ham qorinchalar, ham bo'lmachalar bo'shashadi; III. b bosqichida arteriyalarda hosil bo'lgan qon bosimi, c bosqichidagi qon bosimidan pastroqdir; IV. Jismoniy mashqlar bajarilganda, yurak kameralari qon bilan to'liq to'lishiga imkon bermaydigan darajada bo'shasha olmaydi (ya'ni sikl vaqti qisqaradi).	faqat II	II va III	I,II va III	I,II,III va IV	D		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-02-media-01.png	I,III va IV	t	\N
203	4	3	Quyida bakteriofaga tegishli litik hayot sikli sxemasi berilgan. Bakteriofagning hayot sikli haqidagi quyidagi fikrlardan qaysi biri NOTOG'RI?	Viru'sning ko'paya olishi uchun bakteriya hujayrasi ichida bo'lishi kerak.	Viru's bakteriya hujayrasining ferment sistemalari va ishlab chiqargan ATFdan foydalanadi.	Faqatgina bakteriyalarni zararlay oladigan virus hisoblanadi.	Bakteriya hujayrasiga genetik materialini nusxalagan virus, oqsil qobig'ini bakteriya hujayrasida sintezlay boshlaydi.	E		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-03-media-01.png	Hayot siklining so'ngida bakteriofaglar o'z fermentlari bilan bakteriya hujayrasini parchalaydi.	t	\N
204	4	4	Quyidagi jadvalga mos keluvchi javobni aniqlang.	a-Bo’yi 150–160 sm; b-Kromanyon	c-Bo’yi 155–165 sm; d- Avstralopitek	e-Kalla suyagining hajmi 500–600 sm3; b-Neandertal;	a-Bo’yi 120–140 sm; d- Homo habilis	A		\N		t	<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;width:277.6000pt;border:none;\nmso-border-left-alt:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;mso-border-insideh:1.0000pt solid windowtext;mso-border-insidev:1.0000pt solid windowtext;\nmso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr style="height:16.6500pt;"><td width="382" valign="center" style="width:191.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,176,240);"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Odam ajdodlarining xususiyatlari</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="172" valign="center" style="width:86.4500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,176,240);"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Odam ajdodi</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td></tr><tr style="height:10.6000pt;"><td width="382" valign="center" style="width:191.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Miyasining hajmi 800–1100 sm</span><sup><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;vertical-align:super;">3</span></sup><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="172" valign="center" style="width:86.4500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Pitekantrop</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:7.0000pt;"><td width="382" valign="center" style="width:191.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">A</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="172" valign="center" style="width:86.4500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Sinantrop</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:10.6000pt;"><td width="382" valign="center" style="width:191.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Miyasining hajmi 1600 sm</span><sup><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;vertical-align:super;">3</span></sup><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="172" valign="center" style="width:86.4500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">b</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:7.0000pt;"><td width="382" valign="center" style="width:191.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">C</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="172" valign="center" style="width:86.4500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Neandertal</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:7.0000pt;"><td width="382" valign="center" style="width:191.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Bo’yi 135–150 sm.</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="172" valign="center" style="width:86.4500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">d</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:14.0500pt;"><td width="382" valign="center" style="width:191.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">E</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="172" valign="center" style="width:86.4500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(142,170,219);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;">Avstralopitek</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';font-size:11.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr></tbody></table></body></html>
205	4	5	Tadqiq qilmoqchi bo‘lgan o‘simlik namunalarini tabiiy muhitdan izlayotgan olim, o‘zi qidirayotgan o‘simlik turiga o‘xshash uzoqdagi bir o‘simlikka birdan diqqatini qaratadi. Olim o‘simlikka diqqatni qaratganida: I. Ko‘z gavharining sindirish kuchi kamayadi; II. Kirpikli mushaklar qisqaradi, gavharni ushlab turuvchi boylamlar bo‘shashadi. III. Ko‘z qorachig‘i torayadi; o‘zgarishlaridan qaysilari sodir bo‘ladi?	faqat I	faqat II	faqat III	I va II	A		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-05-media-01.png	I va III	t	\N
206	4	6	Diagrammada berilgan o’simliklar nomini o’qing raqamlar o’rniga umumiy xususiyatlari mos keluvchi to’g’ri javob vairantini aniqlang.?	1-a; 2-b; 3-e	1-a; 2-e; 3-f	1-e; 2-a; 3-d	1-f; 2-b; 3-a	B		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-06-media-01.png		t	<div class="imported-question-image"><img src="/uploads/6-ta-variant-maxsus-javobli/variant-05/question-06-media-02.png" alt="Question media" style="max-width:100%;height:auto;" /></div>\n<div class="imported-question-image"><img src="/uploads/6-ta-variant-maxsus-javobli/variant-05/question-06-media-03.png" alt="Question media" style="max-width:100%;height:auto;" /></div>\n<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;width:453.3500pt;margin-left:6.7500pt;\nmargin-right:6.7500pt;border:none;mso-border-left-alt:0.5000pt solid windowtext;\nmso-border-top-alt:0.5000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;mso-border-bottom-alt:0.5000pt solid windowtext;\nmso-border-insideh:0.5000pt solid windowtext;mso-border-insidev:0.5000pt solid windowtext;mso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr style="height:15.5000pt;"><td width="906" valign="top" style="width:453.3500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">a) Urug’idan ko’payadi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:14.6500pt;"><td width="906" valign="top" style="width:453.3500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">b) hayotiy shakli daraxt</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:15.5000pt;"><td width="906" valign="top" style="width:453.3500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">d) urug’kurtak tugunchada yetiladi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:16.3000pt;"><td width="906" valign="top" style="width:453.3500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">e) ko’p yillik o’simlik</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:15.5000pt;"><td width="906" valign="top" style="width:453.3500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">f) o’tkazuvchi to’qimaga ega</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:13.0500pt;"><td width="906" valign="top" style="width:453.3500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td></tr></tbody></table></body></html>
207	4	7	Quydagi jadvalda mitoz bosqichlari jarayoni berilgan. To’g’ri (ha) va noto’g’ri (yo’q) ma’lumtolarni aniqlang.?	TNTN	NNTT	TNNT	NNTT	D		\N		t	<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;border:none;mso-border-left-alt:0.5000pt solid windowtext;\nmso-border-top-alt:0.5000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;mso-border-bottom-alt:0.5000pt solid windowtext;\nmso-border-insideh:0.5000pt solid windowtext;mso-border-insidev:0.5000pt solid windowtext;mso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr><td width="95" valign="top" style="width:47.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td><td width="608" valign="top" style="width:304.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">O’simliklarda mitoz jarayoni</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="171" valign="top" style="width:85.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">T/N</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="95" valign="top" style="width:47.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;">1</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="608" valign="top" style="width:304.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Faqat somatik hujayralarning bo’linishi hisoblanadi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="171" valign="top" style="width:85.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td></tr><tr><td width="95" valign="top" style="width:47.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;">2</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="608" valign="top" style="width:304.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Mikrosporasit hujayralardan mikrosporalarni hosil qiladi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="171" valign="top" style="width:85.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td></tr><tr><td width="95" valign="top" style="width:47.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;">3</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="608" valign="top" style="width:304.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Yuqori harorat ta’sirida hujayraning bo’linishi to’xtaydi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="171" valign="top" style="width:85.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td></tr><tr><td width="95" valign="top" style="width:47.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;">4</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="608" valign="top" style="width:304.1500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Interfazaning davomiyligi umumiy hujayra siklining 90% ini tashkil</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">etadi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="171" valign="top" style="width:85.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td></tr></tbody></table></body></html>
239	4	39	Pedagogik madaniyatning tarkibiy qismlarini sanang: 1.Nutqning aniqligi va uni muloyimlik bilan suhbatdoshiga yetkaza olishi 2.Nutqni to'g'ri mazmunli ask ettirish 3.Nutqda o'z hissiy kechimmalarini jilovlay olish 4.Nutqni sof holatda yetkazib bera olish	1,2,3	1,2,3,4	2,3,4	1,2,4	D		\N		f	\N
209	4	9	Quyidagi holatlar o’zgaruvchanlikning qaysi turiga misol bo’lishini aniqlang. 1) daltonizm kasalligi; 2) translokatsiya hodisasi; 3) qandli diabet kasalligi; 4) deletsiya hodisasi; 5) aneuploidiya; 6) xromosoma sonini karra oshishi; a) gen mutatsiyasi; b) xromosoma mutatsiyasi; c) genom mutatsiyasi	a-1, 3; b-2, 4; с-5, 6	a-2, 3; b-4, 5; с-1, 6	a-1, 4; b-2, 6; с-3, 5	a-3, 5; b-1, 4; с-2, 6	A		\N		f	\N
210	4	10	Kungaboqarga xos bo’lmagan belgilarni aniqlang. 1) moychechakdoshlar oilachasi vakili; 2) qovoqdoshlar oilasiga kiradi; 3) ozuqasini ildizpoyada to’playdi; 4) shakli o’zgargan yer osti novdaga ega emas; 5) urug’i meva ichida yopiq holda yetiladi; 6) ko’payish a’zosi arxegoniy hisobla-nadi	1, 4, 5	2, 4, 6	2, 3, 6	1, 3, 6	C		\N		f	\N
211	4	11	Aktiniya uchun xos xususiyatlarni aniqlang. 1) jinsiy ko’payish kuzatiladi; 2) embrioni organogenez bos-qichini o’taydi; 3) hujayralarida biokimyoviy ixtisoslashish mavjud; 4) jinsiy organlarga ega; 5) mantiyaga ega; 6) yirt-qich hayvon	1, 3, 6	2, 4, 5	3, 5, 6	1, 2, 4	A		\N		f	\N
212	4	12	Ekologik piramida fitoplankton-zooplankton-mayda ba-liqlardan iborat. Fitoplankton 5000 t bo’lib, 80% qismi is-te’mol qilindi, zooplankton ortgan massasining 20% qismi iste’mol qilinmadi. Zooplankton va mayda baliqlarninglar-ning massaslari necha kilogrammga ortadi?	432000	550000	44000	400000	A		\N		f	\N
213	4	13	Quyidagi shaklda ko'rsatilganidek, fosfolipidlar gidrofil bosh qismi va gidrofob qismiga ega bo'lgan, hujayra membranasi hosil bo'lishida qatnashadigan amfipatik birikmalardir. (Izoh: Amfipatik birikma — bu bir vaqtning o'zida ham gidrofil, ham gidrofob qismlarga ega bo'lgan molekuladir.) Shunga ko'ra, tajriba muhitida 10 ta fosfolipid molekulasi suv ichiga qo'yilsa, quyidagilardan qaysi birida ko'rsatilganidek joylashishi mumkin?					B		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-13-media-01.png		t	<div class="imported-question-image"><img src="/uploads/6-ta-variant-maxsus-javobli/variant-05/question-13-media-02.png" alt="Question media" style="max-width:100%;height:auto;" /></div>
214	4	14	Quyidagi grafikda I, II, III va IV raqamlari bilan ko'rsatilgan hujayralarning sitoplazmasidagi va ular joylashgan muhitdagi K+ (kaliy) ioni konsentratsiyasi (zichligi) berilgan. Bunga ko'ra, raqamlangan hujayralarning qaysilari K+ ionini hujayra ichiga o’tishi uchun ATF energiyasini sarflaydi?	I va II	II va III	III va IV	I,II va III	A		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-14-media-01.png	I,II va IV	t	\N
215	4	15	Kesson kassaligi — dengiz tubiga tushgan odamlar qonidagi suyuqlashgan azotning, yuqoriga (yuzaga) juda tez chiqish natijasida to'satdan gaz holatiga o'tishi va buning oqibatida falajlik yoki o'lim kabi holatlarning yuzaga kelishidir. Kesson kasalligi haqida berilgan quyidagi fikrlardan qaysilari to'g'ri? I. Dengiz tubida bosim ortishi bilan qondagi azot gazining suyuqlashishi sodir bo'ladi; II. Kesson kasalligi tufayli qon aylanishi buzilishi mumkin; III. Chuqurlik ortgani sayin Kesson kasalligi xavfi ortadi.	Faqat II	Faqat III	I va II	II va III	E		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-15-media-01.png	I, II va III Hujayra tashqarisidagi K+ ioni konsentiratsiyasi Hujayraichidagi K+ ioni konsentiratsiyasi	t	\N
216	4	16	Quyidagi jadvalda X, Y, Z, T va V turlarining hamda ushbu turlarning umumiy ajdodida mavjud bo'lgan, ontogenez (rivojlanish) jarayoni uchun javobgar genning nukleotidlar ketma-ketligi ko'rsatilgan. Berilgan ma'lumotlarga ko'ra, umumiy ajdoddan differensiallanib (ajralib) chiqqandan so'ng, ushbu tirik turlardan qaysi biri filogenetik jihatdan eng ko'p o'zgarishga uchragan va ajdodidan uzoqlashgan deb hisoblanadi?	X	Y	Z	T	E		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-16-media-01.png	V	t	\N
217	4	17	Quyidagi grafikda bo'linish orqali ko'payadigan bitta bakteriya sonining vaqtga bog'liq ravishda o'zgarishi ko'rsatilgan. Shunga ko'ra, bakteriya necha marta hujayra bo'linishini amalga oshirgan?	4	6	8	10	B		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-17-media-01.png	12	t	\N
218	4	18	Teri ikki asosiy qavatdan X va Y qavatdan iborat. Y qavatda quyidagilardan qaysilari mavjud.? I. Ter bezlari: II. Malpigi qatlami: III. Qon tomirlari: IV. Soch ildizi.	I va II	I va IV	II va III	I,III va IV	D		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-18-media-01.png	II,III va IV	t	\N
219	4	19	Dengiz mushugining yuragiga ... (I) keladi, maralning yuragidan ... (II) chiqadi. Nuqtalar o’rniga mos keluvchi to’g’ri ma’lumotlar ko’rsatilgan javobni belgilang. 1) kichik qon aylanish doirasi venalari orqali arterial qon; 2) kichik qon aylanish doirasi venalari orqali venoz qon; 3) katta qon aylanish doirasi venalari orqali venoz qon; 4) kichik qon aylanish doirasi arteriyalari orqali venoz qon; 5) katta qon aylanish doirasi venalari orqali arterial qon; 6) katta qon aylanish doirasi arteriyalari orqali venoz qon; 7) katta qon aylanish doirasi arteriyalari orqali arterial qon; 8) kichik qon aylanish doirasi arteriyalari orqali arterial qon	I - 2, 5; II - 3, 8	I - 4, 6; II - 2, 7	I - 1, 5; II - 4, 7	I - 1, 3; II - 4, 7	D		\N		f	\N
220	4	20	Kiprikli chuvalchanglarning parazit yashashga moslash-gan vakillaridan so’rg’ichlilar hamda tasmasimon chuval-changlarning kelib chiqishi (a), yettisoy, murg’ob, xiva qir-g’ovul kenja turlarining paydo bolishi (b), xaltali krot va oddiy krot tashqi qiyofasining o’zaro o’xshashligi (c) qaysi biologik hodisalarni aks ettiradi?	a-divergensiya; b-makroevolutsiya; с- konvergensiya	a-mikroevolutsiya; b- divergensiya; с-makroevolutsiya	a-mikroevolutsiya; b-makroevolutsiya; с-divergensiya	a-makroevolutsiya; b-mikroevolutsiya; с-konvergensiya	D		\N		f	\N
221	4	21	Xordalilar tipining evolutsiyasida aromorfozlarning paydo bolish ketmaketligini aniqlang. 1) miya yarimsharining po’stlog’ida ilonizi burmalar; 2) o’pka devorining ko’plab katakchalarga bo’linganligi; 3) katta va kichik qon aylanish doiralari; 4) nerv nayi; 5) ikki kamerali yurak.	4, 3, 2, 5, 1	4, 3, 5, 1, 2	4, 5, 3, 2, 1	5, 4, 2, 3, 1	C		\N		f	\N
222	4	22	DNKning bitta zanjirida 600 ta pirimidin asosi bo’lib, u umumiy nukleotidlarning 20%ini tashkil qiladi. Shu DNK zanjiri asosida sintezlangan oqsil tarkibidagi monomerlar sonini toping.	400	480	800	500	D		\N		f	\N
235	4	35	Inson tanasida uchraydigan muskul turi quyida sxematik tarzda ko'rsatilgan.	Ixtiyoriy ishlaydi, tez qisqaradi va tez charchaydi	Hujayralarida kislorod saqlovchi mioglobin oqsili bor	Aktin va miozin iplari muskul bo'ylab tartibli joylashgan	Qisqarib - bo'shashishi avtonom (vegetativ) nerv sistemasi orqali boshqariladi	D		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-35-media-01.png	Kislorod yetishmaganda sut kislotali bijg'ishni amalga oshiradi.	t	\N
236	4	36	O'qituvchi stol ustiga tortburchak qog'ozlar qoydi bunda qog'ozlar butun , uchdan biri, ikkidan biri , bolaklarga bolingan edi Dinara nonning 1/2 qismini , Diyor 1/4 qismini yedi , o'qituvchi savol berdi qaysi ko'p yegan, ikkisi birgalikda qancha qism yegan o'zingiz topgan bolaklarni stol ustidagi bo'laklardan oling deb aytadi. Bunda qanday metodam foydalangan.	tasvir	namoyish	tushuntirish		B		\N		f	\N
237	4	37	O'qituvchi o'quvchilarga "Ulushlar"mavzusini tushuntirdi. O'qituvchi o'quvchilar olgan bilimlari yuzasidan misollar ishlashni aytdi. Bunda Blumtaksanomiyasining qanday bosqichi namoyon bo'lmoqda?	tushunish	qo`llash	bilish	tahlil qilish	B		\N		f	\N
223	4	23	Jadvalda berilgan biotik munosobatlarga mos keluvchi to’g’ri javobni aniqlang.?	ayrim baliqlarmeduzalar vaaktiniyalarningpaypaslagichlariorasiga yashirinibolishi | Ayrim baliq turlari,yirik baliqlar terisini,jabra va og’izbo’shlig’iniparazitlardantozalab berishi | Dukkaklio’simliklarningildizida uchraydigantugunakbakteriyalarinihamkorlikdagimunosabati	tuproqda yashovchisaprofit bakteriyalarvao’simliklaro’rtasidagi munosabat | Qushlar, kemiruvchihayvonlarninguyalarida turlio’rgimchaksimonlar vahasharotlarni yashashi | Termitlar vaularning ichagidayashovchi birhujayrali xivchinlilaro’rtasidagimunosabatlar	Ayrim baliq turlari,yirik baliqlarterisini, jabra vaog’iz boshlig’iniparazitlardan tozalabberishi | daraxtlarning tanasi vashoxlarida epifito’simliklar(orxideya, yo’sinlar) valishayniklar joylashibolishi | Mikorizaqalpoqchalizamburug’lar vayuksak o’simliklaro’rtasidagimunosabat	Termitlar vaularning ichagidayashovchi birhujayrali xivchinlilaro’rtasidagimunosabatlar | Ayrim baliq turlari,yirik baliqlar terisini,jabra va og’izbo’shlig’iniparazitlardantozalab berishi | tuproqda yashovchisaprofit bakteriyalarvao’simliklaro’rtasidagimunosabat	C		\N		t	<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;border:none;mso-border-left-alt:0.5000pt solid windowtext;\nmso-border-top-alt:0.5000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;mso-border-bottom-alt:0.5000pt solid windowtext;\nmso-border-insideh:0.5000pt solid windowtext;mso-border-insidev:0.5000pt solid windowtext;mso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Vairantlar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="283" valign="top" style="width:141.7500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Protokooperatsiya</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="295" valign="top" style="width:147.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Hamsoyalik</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Mutualizm</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;">A</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="283" valign="top" style="width:141.7500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">ayrim baliqlar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">meduzalar va</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">aktiniyalarning</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">paypaslagichlari</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">orasiga yashirinib</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">olishi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="295" valign="top" style="width:147.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Ayrim baliq turlari,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">yirik baliqlar terisini,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">jabra va og’iz</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">bo’shlig’iniparazitlardan</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">tozalab berishi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Dukkakli</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">o’simliklarning</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">ildizida uchraydigan</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">tugunak</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">bakteriyalarini</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">hamkorlikdagi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">munosabati</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;">B</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="283" valign="top" style="width:141.7500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">tuproqda yashovchi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">saprofit bakteriyalar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">va</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">o’simliklar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">o’rtasidagi munosabat</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="295" valign="top" style="width:147.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Qushlar, kemiruvchi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">hayvonlarning</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">uyalarida turli</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">o’rgimchaksimonlar va</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">hasharotlarni yashashi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Termitlar va</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">ularning ichagida</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">yashovchi bir</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">hujayrali xivchinlilar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">o’rtasidagi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">munosabatlar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">C</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="283" valign="top" style="width:141.7500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">Ayrim baliq turlari,</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">yirik baliqlar</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">terisini, jabra va</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">og’iz boshlig’ini</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">parazitlardan tozalab</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">berishi</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="295" valign="top" style="width:147.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">daraxtlarning tanasi va</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">shoxlarida epifit</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">o’simliklar</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">(orxideya, yo’sinlar) va</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">lishayniklar joylashib</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">olishi</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">Mikoriza</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">qalpoqchali</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">zamburug’lar va</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">yuksak o’simliklar</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nmso-ansi-font-weight:bold;font-size:12.0000pt;mso-font-kerning:0.0000pt;">o’rtasidagimunosabat</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;mso-ansi-font-weight:bold;\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td></tr><tr><td width="138" valign="top" style="width:69.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;">D</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="283" valign="top" style="width:141.7500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Termitlar va</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">ularning ichagida</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">yashovchi bir</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">hujayrali xivchinlilar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">o’rtasidagi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">munosabatlar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="295" valign="top" style="width:147.9500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">Ayrim baliq turlari,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">yirik baliqlar terisini,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">jabra va og’iz</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">bo’shlig’iniparazitlardan</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">tozalab berishi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="239" valign="top" style="width:119.6500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">tuproqda yashovchi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">saprofit bakteriyalar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">va</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">o’simliklar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">o’rtasidagi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:12.0000pt;mso-font-kerning:0.0000pt;">munosabat</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;font-size:12.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr></tbody></table></body></html>
224	4	24	Quyidagi grafik erkak va urg'ochi Belding yer olmaxonlarining yoshga bog'liq ravishda tirik qolish ko'rsatkichlarini ifodalaydi. Grafikka ko'ra, ushbu turning normal tirik qolish egri chizig'i quyidagilardan qaysi biri?					B		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-24-media-01.png		t	<div class="imported-question-image"><img src="/uploads/6-ta-variant-maxsus-javobli/variant-05/question-24-media-02.png" alt="Question media" style="max-width:100%;height:auto;" /></div>
225	4	25	Sezgi analizatorlari haqida to’g’ri fikrni toping	Qo’ziqorinsimon so’rg’ich hid bilish retseptorlarida uchraydi	Tug’ma yaqinni ko’rish ko’z kosasini qisqa bo’lishi bilan bog’liq	egatsimon so’rg’ich tam bilish retseptori	Taktil so’rgich labirintlar ichida	C		\N		f	\N
226	4	26	Quyidagi o'simliklar ichidan qumli cho'llarda o'sadiganini aniqlang	14,17,20,27	1,11,23,21	5,7,8,19,28	3,9,15,20	A		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-26-media-01.png		t	\N
227	4	27	Tadqiqotchi tomonidan qisqichbaqalar turi bilan o'tkazilgan tajriba natijasida olingan natijalar quyidagi grafikda ko'rsatilgan. Tadqiqot natijalariga ko'ra, 3% sho'r suvda saqlanadigan qisqichbaqalar kamroq kislorod iste'mol qilgan, ko'proq ko'paygan va kattalashgan, 15% sho'r suvda saqlangan qisqichbaqalar esa ko'proq kislorod iste'mol qilgan, kichikroq bo'lib qolgan va ko'payish tezligi sekinroq bo'lgan. Shunga ko'ra, I. Qisqichbaqalar turi faqat 3% sho'r suvda yashay oladi. II. 15% sho'r suvda saqlanadigan qisqichbaqalar ko'proq faol transportga ega bo'lishi mumkin. III. Qisqichbaqalar xujayralari faol transport yordamida suv va kislorodni 15% tuzli suv muhitida tashigan bo'lishi mumkin. Quyidagi fikrlardan qaysi biri to‘g‘ri?	I – fikr to’g’ri	II – fikr to’g’ri	III – fikr to’g’ri	I va II – fikr to’g’ri	B		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-27-media-01.png		t	\N
228	4	28	Ba'zi moddalarning PH qiymatlari quyida keltirilgan. Shunga ko'ra, pH qiymatlari bo'yicha quyidagi xulosalardan qaysi biri noto'g'ri?	Toza suvda H+ va OH- ionlarining konsentratsiyasi teng	Limon suvli eritmaga H+ ionlarini, sovun esa OH- ionlarini beradi	Bananlar olmaga qaraganda kislotaliroq	Qondagi H+ konsentratsiyasi sutdagi H+ konsentratsiyasidan past	E		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-28-media-01.png	pH qiymati 7 dan 14 gacha yaqinlashganda, suvli eritmalarning asosligi ortadi	t	\N
229	4	29	Nerv tolasiga berilgan ketma-ket stimullarning intensivligi quyidagi grafikda keltirilgan. Grafiklardan qaysi biri to'g'ri chizilgan?	Faqat I	I va III	Faqat III	II va III	D		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-29-media-01.png		t	\N
230	4	30	Jadvalning qaysi qatoriarida (№) organizmlar va ular-ning rudiment organlari va ular mansub turkumlar muvofiq tarzda berilgan?	1, 4, 5;	2, 3, 4;	1, 3, 5;	1, 2, 5	C		\N		t	<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;mso-table-layout-alt:fixed;border:none;\nmso-border-left-alt:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;mso-border-insideh:1.0000pt solid windowtext;mso-border-insidev:1.0000pt solid windowtext;\nmso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr style="height:5.5500pt;"><td width="50" valign="center" style="width:25.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;"><font face="Calibri">№</font></span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="235" valign="center" style="width:117.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;">Rudiment organ</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="125" valign="center" style="width:62.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;">Organizm</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="144" valign="center" style="width:72.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;">Turkum</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td></tr><tr style="height:8.3000pt;"><td width="50" valign="center" style="width:25.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;">1</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="235" valign="center" style="width:117.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Ikkinchi va to’rtinchi barmoqlari</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="125" valign="center" style="width:62.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Vladimir</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="144" valign="center" style="width:72.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Toq tuyoqlila</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:8.3000pt;"><td width="50" valign="center" style="width:25.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;">2</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="235" valign="center" style="width:117.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Dumg’aza va orqa oyoq suyaklari</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="125" valign="center" style="width:62.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Kivi</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="144" valign="center" style="width:72.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Tuyaqush</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:5.5500pt;"><td width="50" valign="center" style="width:25.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;">3</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="235" valign="center" style="width:117.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Bir juft kichik qanotlar</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="125" valign="center" style="width:62.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Bo’ka</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="144" valign="center" style="width:72.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Ikki qanotlilar</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:5.5500pt;"><td width="50" valign="center" style="width:25.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;">4</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="235" valign="center" style="width:117.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Qanot skeleti suyaklari</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="125" valign="center" style="width:62.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Poliksina</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="144" valign="center" style="width:72.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Tangacha-</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">qanotlilar</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:5.5500pt;"><td width="50" valign="center" style="width:25.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(0,204,92);"><p class="MsoNormal"><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;">5</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-ansi-font-weight:bold;\nmso-bidi-font-style:italic;font-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="235" valign="center" style="width:117.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Uchinchi qovoq</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="125" valign="center" style="width:62.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Odam</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="144" valign="center" style="width:72.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(153,255,51);"><p class="MsoNormal"><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;">Primat</span><span style="font-family:Calibri;mso-bidi-font-family:'Times New Roman';mso-bidi-font-style:italic;\nfont-size:11.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr></tbody></table></body></html>
231	4	31	Jasur spektakl markaziga tashrif buyurar ekan, tepasida baland cho‘zilgan arqonda yurgan, bir oyoqda betakror harakatlar bilan tura oladigan akrobatni hayrat bilan kuzatdi. Jasur ushbu ko‘rsatuvni tomosha qilar ekan, akrobat markaziy asab tizimining qaysi qismlaridan samaraliroq foydalangani haqida o‘ylagan bo‘lishi mumkin edi?	Miya ko’prigi – Bosh miyaning oldingi qismi	Orqa miya – O’rta miya	Gipotalamus – Miya ko’prigi	Miyacha – Gipotalamus	E		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-31-media-01.png	Orqa miya – Miyacha	t	\N
232	4	32	Quyidagi jadvalda filogenetik daraxt berilgan,daraxtni taxlil qilib umumiy bo’lmagan jihat to’g’ri berilgan javobni aniqlang	toshbaqa va qurbaqa uchun birlashgan jag’lar umumiy jihat	levrak va toshbaqa uchun yuruvchi to’rt oyoqlar umumiy jihat	qurbaqa va leopard uchun birlashgan jag’lar umumiy jihat	leopard va toshbaqa uchun amnion parda umumiy jihat	B		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-32-media-01.png		t	\N
233	4	33	O'simlik hujayrasi noma'lum konsentratsiyali muhitga joylashtirilganda, hujayradagi bosim qiymatlari quyidagi grafikda ko'rsatilganidek o'zgaradi. Shunga ko'ra, ushbu hujayra haqida: I. Membrana va devor orasidagi masofa oshadi. II. Markaziy vakuolaning kontsentratsiyasi kamaydi. III. U plazmolizga uchradi. Ushbu xulosalardan qaysi biri to’g’ri bo’lishi mumkin?	Faqat 1 – fikr	Faqat 2 – fikr	Faqat 3 – fikr	I va III fikr to’g’ri	B		/uploads/6-ta-variant-maxsus-javobli/variant-05/question-33-media-01.png	I,II va III fikr to’g’ri	t	\N
234	4	34	Gekkon kariotipida jami xromasomalar soni 24 ta bo’lib, o’rganilayotgan barcha belgilarni ifodalovchi genlar gomo-zigota holatida. Erkak gekkon tana hujayrasida necha xil DNK molekulasi mavjud?	13	24	12	22	C		\N		f	\N
238	4	38	Pifagor teoremasida tayyor formula mavjud. O'quvchi masalani ishlashda masalani shu formulaga qo'yib ishladi. Bunda Blum taksanomiyasining qaysi bosqichi namoyon bo'lmoqda?	tushunish	qo`llash	bilish	sintez	B		\N		f	\N
240	4	40	O'qituvchi darsga kirganda har doim o'tgan mavzu yuzasidan 10talik test tuzib kiradi, savollar unchalik hal murakkab emas. Test tugaganidan so'ng test natijalarini doimiy yozib o'quvchilarning yutuq va kamchiliklarini aniqlab, qaysi mavzuga ko'proq urg'u berish kerakligini bilib oladi. Bunda o'qituvchi qaysi mehnat vazifasidan foydalanmoqda?	Oʻquvchilar tomonidan bilimlarni egallash darajasini (hajmini) muntazam / tizimli ravishda kuzatib borish	Oʻquvchilar erishgan yutuqlarni natijalarini tahlil qilish	Dars rejasi va usullarini moslashtirishda tahlil natijalaridan foydalanish	Oʻquvchining yutuqlarini baholash, baho asoslab berish	A		\N		f	\N
241	4	41	Pedagogik faoliyatda nizolar ham bo'lib turadi. Muassasada bir nechta xodimlar o‘rtasida davomli nizolar kuzatilmoqda edi. Direktor o'qtuvchilardan bittasini boshqa ishga ya'ni binoni ichidagi boshqa joyga, ikkinchisini esa yana qandaydir ish bilan band qildi, bu xodimlarning ish soatlarini, ish xonalarini va vazifalarini o‘zgartirib, ularni bir-biridan uzoqlashtirdi. Bunda nizoni hal qilishning qaysi usulidan foydalanilgan?	tinch yo`l bilan kelishish	ogohlantirish	suhbat asosida hal qilish	o`zaro ajratish	D		\N		f	\N
242	4	42	O'qituvchi darsni umumiy holatda tushuntirdi va o'quvchilarga yaxshi tushunarli bo'lishi uchun misollar ishladi. Bunda o'qituvchi qanday metoddan foydalanmoqda?	induksiya	deduksiya	analogiya		B		\N		f	\N
243	4	43	Quyida qaysi metod haqida so'z bormoqda? Afzalliklari: O‘quvchilarga bilimlarni tizimli va tartibli yetkazadi. Mantiqiy fikrlashni rivojlantiradi, xulosalarga tez yetib borishni o‘rgatadi. Qisqa vaqt ichida ko‘p nazariy materialni o‘zlashtirish imkonini beradi. Tayyor bilimlar asosida murakkab muammolarni yechishga yordam beradi. Kamchiliklari: O‘quvchilarning mustaqil fikrlashi va izlanish qobiliyatini cheklashi mumkin. Dars jarayonida o‘quvchilarning faolligi sustlashadi. O‘z bilimlarini mustaqil shakllantirish imkoniyati kamayadi. O‘quvchilar tayyor bilimni qabul qiluvchi rolida qolib ketishi mumkin.	induktiv metod	analogiya	amaliy metod	deduktiv metod	D		\N		f	\N
244	4	44	Maktabda 2ta o'qituvchi orasida o'zaro nizo kelib chiqdi. Maktab rahbari nizoni hal qilish uchun nizoning kelib chiqish sabablarini, barcha tafsilotlarini so'rab, aniqlik kiritib, undan so'ng qaror qabul qildi. Bu nizoni hal qilishning qanday usuli hisoblanadi?	rahbar buyrug`I	kuch bilan hal qilish	sud qarori	axloq komissiyasi	A		\N		f	\N
245	4	45	Maktabda 2ta o'qituvchi o'zaro tortishib qoldi. Bu nizoni hal qilish uchun maktab derektori o'qituvchilarga keltirilgan dalillar va hujjatlar asosida chora ko'rdi. Bunda nizoni hal qilishning qanday usuli namoyon bo'ldi?	noan’anaviy usul	huquqiy-normativ asos	intuitsiyaga tayangan holda	emotsional yondashuv	B		\N		f	\N
246	4	46	Tabiiy fan darsida o'quvchilar o'zlari suv filtirlash uchun filter yasab undan suvni o'tkazishdi. O'qituvchi faqat kuzatib turdi. Bunda qanday metod namoyon bo'lmoqda?	amaliy metod	tasvir metodi	namoyish metodi	hikoya metodi	A		\N		f	\N
247	4	47	O'qituvchi tumanda o'tkazilgan "O'rta ta'limda sun'iy intellektdan foydalanish" nomli seminatda qatnashib kelib, bu haqida o'quvchilar bilan o'rtoqlashdi va o'rganganlarini darsdaqo'llashga harakat qildi. Bunda o'qituvchining qanday mehnat harakatlari namoyon bo'lmoqda?	o`zlashtirishni baholash va qayta aloqani taqdim etish	ta’lim samaradorligini ta’minlash	o`z-o`zini rivojlantirish va kasbiy o`sish	xavfsiz rivojlantiruvchi ta’lim muhitini yaratish	C		\N		f	\N
248	4	48	O'qituvchi darsida o'quvchilar mavzuni zo'r tushunayotganligi darsda hamma faol qatnashayotganligi o'quvchilarda zerikish bo'lmayotganligi o'quvchilar fikrlarini erkin kuzatayotganligini kuzatdi savol o'qituvchi darsga yana qanday o'zgartirish kiritishi kerak ?	Boshqalarning darsiga kirib kasbiy mahoratini oshirishi	O'z tajribalarini ish uslublaririni ommalashtirishi	Ko'proq ochiq dars o'tishga tayyorlanish va ochiq dars o'tish	Hamkasblar va mutaxasislar bilan dars o'tish haqida suhbatlashish	B		\N		f	\N
249	4	49	Pedagogik jarayon kutilmagan hodisa va anglashilmovchiliklardan holi emas. Bunday holatlar turli ko'rinishdagi nizolarni keltirib chiqaradi. Agar o'qituvchi o'quvchining noto'g'ri xatti-harakatini tanqid qilmasdan, uning sabab va oqibatlari haqida gapirsa, nizoga sabab bo'lgan tomonlarga nisbatan muloyim va izchil muloqot orqali qanday qilib to'g'riνα maqbul tarzda harakat qilish mumkinligini ko'rsata olsa, pedagogik nizolarni hal qilishning qanday usulini qo'llagan hisoblanadi?	tushuntirish usuli	iltimos usuli	talab usuli	sud qarori usuli	A		\N		f	\N
250	4	50	Kommunikativ nutqning muvoffaqiyatli bo'lishi uchun o'qituvchi o'zida notiqlik san'atiga xos qator maxsus qobiliyatlarni rivojlantirishi talab qilinadi. Quyida berilganlardan o'zini boshqara olish qobiliyatining asosiy jihatlarini aniqlang. 1.O'z-o'zini tinchlantirish va qiyin vaziyatlarda bardoshli bo'lish 2.Jamiyatdagi bugungi hodisalarni o'z o'tmishidagi voqealar va jarayonlar bilan bog'lash 3.Maqsadlarga erishishda ishtiyoq va qatiyatni saqlash 4.O'z hissiy va intelektual holatini anglash va rivojlantirish	1,2,3	1,3,4	2,3,4	1,2,3,4	B		\N		f	\N
251	4	1	Quyidagi jadvalga mos organizmlar to’g’ri keltirilgan qatorni toping.?	I – dreysena; II – qoraqurt; III – chuchuk suv gidrasi	I - yalang’och shilliq; II – yomg’ir chuvalchang; III – qizil chuvalchang	I – baqachanoq; II – kamchatka; III – bitiniya	I – planariya; II – nereida; III – oddiy amyoba	A		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-01-media-01.png		t	<div class="imported-question-image"><img src="/uploads/6-ta-variant-maxsus-javobli/variant-06/question-01-media-02.png" alt="Question media" style="max-width:100%;height:auto;" /></div>
252	4	2	Quyidagi o'simliklar ichidan adirda o'sadiganini aniqlang	14,17,20,21	1,11,22,23	5,7,8,19,28	3,9,15	C		\N		f	\N
253	4	3	Exinokokkning hayot sikli aks ettirilgan sxemadagi 1 va 2-raqamlarga qanday bosqichlar mos keladi?	1 - tuxum; 2 - qoramol qonidagi lichinka	1 - qoramol ichagidagi tuxum; 2 - qoramol qonidagi voyaga yetgan exinokokk	1 - asosiy xo’jayin ichagidagi lichinka; 2 - qoramol qonidagi voyaga yetgan parazit	1 - tuxum; 2 - it organizmida sista hosil qilayotgan lichinka	A		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-03-media-01.png		t	\N
254	4	4	Quyidagi ma’lumotlar qaysi organizmlarga tegishli ekanligini aniqlang. 1) atmosfera kislorodi bilan nafas oladi; 2) suvda erigan kislorod bilan nafas oladi; 3) jabra yordamida nafas oladi	1-baqachanoq; 2-dafniya; 3-krevetka	1-apollon; 2-perlovitsa; 3-langust	1-zorka; 2-yomg'ir chuvalchangi; 3-biy	1-tovusko'z; 2-langust; 3-qoraqurt	B		\N		f	\N
267	4	17	Quyidagi diagrammada turli konsentratsiyali muhitda joylashtirilgan o'simlik va hayvon hujayralaridagi o'zgarishlar ko'rsatilgan. Ushbu malumotlardan foydalanib to’g’ri fikrni aniqlang.? I. Gipertonik muhitga qo'yilgan o'simlik hujayrasida turgor bosimi kamayadi; II. Gipotonik muhitga joylashtirilganda, qizil qon hujayralari gemolizga uchraydi; III. O'simlik hujayralari qalin hujayra devoriga ega bo'lgani uchun gipotonik muhitda yorilib ketmaydi	I	II	III	II va III	E		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-17-media-01.png	I,II va III	t	\N
255	4	5	Jadvalda berilgan ma’lumotlar asosida to’g’ri fikrni aniqlang.?	1,2,4	1,3,4	2,4,5	1,3,5	D		\N		t	<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;margin-left:18.0000pt;border:none;\nmso-border-left-alt:0.5000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;mso-border-insideh:0.5000pt solid windowtext;mso-border-insidev:0.5000pt solid windowtext;\nmso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr><td width="102" valign="top" style="width:51.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">T/r</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="568" valign="top" style="width:284.3500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">Ma’lumotlar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="335" valign="top" style="width:167.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">Ha/Yoq</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="102" valign="top" style="width:51.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">1</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="568" valign="top" style="width:284.3500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">To`lqin uzunligi 290–380 nm bo’lgan</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">ultrabinafsha nurlar bakteriyalarni nobud</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">qilish xususiyatiga ega</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="335" valign="top" style="width:167.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">Ha</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="102" valign="top" style="width:51.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">2</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="568" valign="top" style="width:284.3500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">400–750 nm bo’lgan nurlar ta’sirida teri</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">pigmenti – melanin, ko’z to’r pardasi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">pigmenti va D vitamin sintezlanadi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="335" valign="top" style="width:167.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">Ha</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="102" valign="top" style="width:51.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">3</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="568" valign="top" style="width:284.3500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">Fotonastiya o’simlik organlarining yorug’lik</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">tomonga o’sish orqali amalga oshadigan</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">harakati hisoblanadi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="335" valign="top" style="width:167.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">Yoq</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="102" valign="top" style="width:51.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">4</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="568" valign="top" style="width:284.3500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">Infraqizil nurlar quyosh spektridagi yerga</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">yetib keladigan nurlarning qancha 45 % dan</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">ortig’ini tashkil etadi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="335" valign="top" style="width:167.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">Yoq</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr><td width="102" valign="top" style="width:51.2000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">5</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="568" valign="top" style="width:284.3500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">Tuproqda va g’orda yashovchi organizmlar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><br></span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">uchun yorug’lik muhim omil sanalmaydi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="335" valign="top" style="width:167.5000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:0.5000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:0.5000pt solid windowtext;\nborder-top:none;mso-border-top-alt:0.5000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:0.5000pt solid windowtext;"><p class="MsoNormal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;">Ha</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;color:rgb(0,0,0);\nfont-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr></tbody></table></body></html>
256	4	6	Ven diagrammasi asosida to’g’ri fikrni aniqlang.?	I – 3 – yarusni egallaydi hayotiy shakli buta; II – 1 – yarusni egallaydi hayotiy shakli daraxt; III – arxegoniyga ega	I – 4 – yarusni egallaydi hayotiy shakli yarim buta; II – 1 – yarusni egallaydi hayotiy shakli daraxt; III – urug’kurtaka ega	I – 4 – yarusni egallaydi hayotiy shakli yarim buta; II – 2 – yarusni egallaydi hayotiy shakli daraxt; III – urug’kurtaka ega	I – 3 – yarusni egallaydi hayotiy shakli buta; II – 1 – yarusni egallaydi hayotiy shakli daraxt; III – chang donasi va o’tkazuvchi sistemaga ega	D		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-06-media-01.png		t	\N
257	4	7	Ushbu jadvalda tasvirlangan organizmlar haqida to’g’ri fikrni aniqlang.?					A		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-07-media-01.png		t	\N
258	4	8	Quyidagi ven diagrammasi foydalanib to’g’ri javobni aniqlang.?	I - Zamburug‘ hujayrasi qobig‘i va bo‘g‘imoyoqlilar tana qoplamiga mustahkamlik beradi; II - Murein bakteriya hujayrasi devori tarkibiga kiradi; III - Hayvonlarda qon ivishiga to‘sqinlik qiladi; IV – Plastik funksiyani bajaradi; V – Getropolimer hisoblanadi	I - Xitin tarkibida azot saqlaydi; II - Murein bakteriya hujayrasi devori tarkibiga kiradi; III – Jigardan ishlab chiqariladi qon ivishiga to’sqinlik qiladi; IV – Plastik funksiyani bajaradi; V – Polisaxaridlar guruhiga mansub	I - Zamburug‘ hujayrasi qobig‘i va bo‘g‘imoyoqlilar tana qoplamiga mustahkamlik beradi; II – Lishaynik hujayrasi devori tarkibiga kiradi; III - Hayvonlarda zaxira oziq modda sifatida to’planadi; IV - qurilish materiali hisoblanadi; V – monomeri glukoza hisoblanadi	I - Xitin tarkibida azot saqlaydi; II – Murein sianobakteriyalar hujayrasi devori tarkibiga kiradi; III - Jigardan ishlab chiqariladi qon ivishiga to’sqinlik qiladi; IV - Himoya funksiyasini bajaradi: V – Gidrofob modda hisoblanadi	B		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-08-media-01.png		t	\N
259	4	9	Tirik organizmlarda PH qiymatini barqaror saqlash uchun bufer Sistema muhim ro’l o’ynaydi. Bu birikmalar muhitda H+ ionlari ko'payganda ularni biriktirib olish, H+ ionlari kamayganda esa ularni chiqarish xususiyatiga ega. Inson qoni va boshqa tana suyuqliklarida H+ ionlari konsentratsiyasini muvozanatlovchi turli buferlar mavjud. Masalan; qon plazmasidagi suv va karbonat angidridning birlashishidan hosil bo'lgan karbonat kislota ana shunday birikmalardan biridir. Quyidagi reaksiyada karbonat kislotaning buferlik roli ko'rsatilgan: I. Qon pH ko'rsatkichi tushganda (kislotalilik ortganda), reaksiya L yo'nalishida davom etadi. II. Qon pH ko'rsatkichi ko'tarilganda (ishqoriylik ortganda), reaksiya K yo'nalishida davom etadi. III. Berilgan reaksiyaning borish yo'nalishini qon pH qiymatining tushishi yoki ko'tarilishi belgilaydi. ushbu fikrlarning qaysilari to'g'ri?	Faqat III	I va II	I va III	II va III	E		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-09-media-01.png	I,II va III	t	\N
260	4	10	DNK molekulasida 4 xil A,T,C,G nukleotidlari mavjud A va T o’rtasida 2 H bog’ C va G nukleotidlari orasida esa 3 ta H bog’ mavjud.DNK molekulasida 2000ta nukleotid mavjud bo’lib, G nukleotidlar soni T nukleotidlarining 25%ini tashkil qilsa,DNK molekulasidagi jami G sonini toping.	400	600	100	200	D		\N		f	\N
261	4	11	Yirtqichlar va ularga xos belgilarni juftlab ko‘rsating. a) bo‘rilar; 1) oyoqlari kalta, tanasi ingichka; b) tulkilar; 2) qish faslida uyquga ketadi; d) mushuksimonlar; 3) yil bo‘yi juft bo‘lib yashaydi; e) suvsarlar; 4) yozda inida, qishda iniga kirmaydi; f) ayiqlar. 5) tirnoqlari xaltachaga kirib turadi.	a-3,b-4,d-5,e-1,f-2.	a-4,b-3,d-5,e-1,f-2.	a-3,b-2,d-5,e-1,f-4.	a-3,b-4,d-1,e-5,f-2.	A		\N		f	\N
262	4	12	Sxemada tritonning bazi tana qasmlarida qondagi kis-lorod miqdori keltirilgan. Bunga ko’ra I, II, III lar haqidagi to’g’ri fikrlarni aniqlang.	I ifodasi teri kapillarlarini ifodalaydi	II ifodasi vena qon tomirlarini ifodalaydi	III ifodasi yurak qorinchasini ifodalaydi	II ifodasi yurak qorinchasini ifodalaydi	B		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-12-media-01.png		t	\N
263	4	13	Sterlyat (a) va skat (b)ning bosh skeleti suyaklarini to’g’ri juftlang. 1) jag’lar; 2) jabra varoqlari; 3) jabra ravoqlari; 4) kamar suyaklari; 5) jabra qopqog’i	a - 1, 3, 5; b-1, 3;	a - 1, 5; b-1, 2, 3;	a - 1, 2, 3; b-1, 3;	a - 1, 3, 4; b-1, 2, 3;	A		\N		f	\N
264	4	14	Organizmlarning ko‘payish va rivojlanish jarayoni bilan bog‘liq bo‘lgan to‘g‘ri ma’lumotlarni aniqlang. 1) qirg‘ovulning tuxumdan chiqqan bolasining ko‘zi yumuq, tanasi siyrak par bilan qoplangan bo‘ladi; 2) uy pashshasi tuxumidan boshi va oyog‘i bo‘lmaydigan lichinka chiqadi; 3) nam tuproqda odam askaridasi tuxumida lichinkalar rivojlanadi; 4) suv shillig‘i germafrodit ekanligi bilan oq planariyadan farq qiladi 5) qum bo‘g‘ma iloni tirik tug‘ishi bilan kaltakesakdan farq qiladi; 6) tulkilar va tyulenlar tug‘ilgan bolasining ko‘zi yumuq bo‘ladi	2, 3, 5	1, 4, 6	2, 4, 5	1, 3 ,5	A		\N		f	\N
265	4	15	Jadvalning qaysi qatoriarida (№) hayvonlar, ularning xususiyatlari va ular mansub turkumlar muvofiq tarzda berilgan?	1, 2, 4;	2, 4, 6;	3, 4, 6;	2, 4, 5;	D		\N		t	<html><head></head><body><table class="53" border="1" cellspacing="0" style="border-collapse:collapse;width:273.0000pt;mso-table-layout-alt:fixed;\nborder:none;mso-border-left-alt:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;\nmso-border-right-alt:1.0000pt solid windowtext;mso-border-bottom-alt:1.0000pt solid windowtext;mso-border-insideh:1.0000pt solid windowtext;\nmso-border-insidev:1.0000pt solid windowtext;mso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr style="height:5.6500pt;"><td width="42" valign="center" style="width:21.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:none;mso-border-right-alt:none;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(68,114,196);"><p class="MsoNormal" style="line-height:115%;"><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><font face="Times New Roman">№</font></span></b><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="114" valign="center" style="width:57.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:none;mso-border-right-alt:none;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(68,114,196);"><p class="MsoNormal" style="line-height:115%;"><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">Orga-nizm</span></b><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="240" valign="center" style="width:120.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:none;mso-border-right-alt:none;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(68,114,196);"><p class="MsoNormal" style="line-height:115%;"><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">Organizmlarning</span></b><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p><p class="MsoNormal" style="line-height:115%;"><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">xususiyatlari</span></b><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="148" valign="center" style="width:74.4000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(68,114,196);"><p class="MsoNormal" style="line-height:115%;"><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">Turkum</span></b><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td></tr><tr style="height:5.3500pt;"><td width="42" valign="center" style="width:21.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(217,226,243);"><p class="MsoNormal" style="line-height:115%;"><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">1</span></b><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="114" valign="center" style="width:57.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(217,226,243);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">Dorivor</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">qo‘qio‘t</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="240" valign="center" style="width:120.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(217,226,243);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">ko‘p yillik o‘t, guli ikki jinsli</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="148" valign="center" style="width:74.4000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(217,226,243);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">qo‘qio‘t</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:10.9000pt;"><td width="42" valign="center" style="width:21.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;"><p class="MsoNormal" style="line-height:115%;"><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">2</span></b><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="114" valign="center" style="width:57.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">sariq chayon</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="240" valign="center" style="width:120.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">og‘iz organi ikki juft,</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">ayrim jinsli, harakat</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">organlari 4 juft</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="148" valign="center" style="width:74.4000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">chayonlar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:8.2500pt;"><td width="42" valign="center" style="width:21.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(217,226,243);"><p class="MsoNormal" style="line-height:115%;"><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">3</span></b><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="114" valign="center" style="width:57.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(217,226,243);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">Chigirtka</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="240" valign="center" style="width:120.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(217,226,243);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">to‘liq o‘zgarish bilan rivojlanadi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="148" valign="center" style="width:74.4000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(217,226,243);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">ninachilar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:13.6000pt;"><td width="42" valign="center" style="width:21.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;"><p class="MsoNormal" style="line-height:115%;"><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">4</span></b><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="114" valign="center" style="width:57.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">Chumoli</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="240" valign="center" style="width:120.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">ishchisi-ko‘payish</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">qobiliyatini yo’qotgan</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">urg'ochilar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="148" valign="center" style="width:74.4000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">pardaqanot-lilar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:10.9000pt;"><td width="42" valign="center" style="width:21.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(217,226,243);"><p class="MsoNormal" style="line-height:115%;"><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">5</span></b><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="114" valign="center" style="width:57.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(217,226,243);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">Biy</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="240" valign="center" style="width:120.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(217,226,243);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">tanasi boshko‘krak</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">va qorin qismlardan</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">iborat</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="148" valign="center" style="width:74.4000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(217,226,243);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">o‘rgimchak-lar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:8.0500pt;"><td width="42" valign="center" style="width:21.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;"><p class="MsoNormal" style="line-height:115%;"><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">6</span></b><b><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="114" valign="center" style="width:57.0000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">Iskabto-parlar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="240" valign="center" style="width:120.3000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">yomon yara kasalligi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">qo‘zg‘atuvchisi</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="148" valign="center" style="width:74.4000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">pardaqanot-lilar</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr></tbody></table></body></html>
266	4	16	Quyidagilarning qaysi birida qizilto'sh organizmida qon harakati yo'nalishi to'g'ri ko'rsatilgan? 1) chap bo'lmachadan chap qorinchaga; 2) o'pka arteriyasidan chap bo'lmachaga; 3) venadan o'ng bo'lmachaga; 4) o'pka venasidan chap bo'lmachaga; 5) o'ng qorinchadan o'pka arteriyasi; 6) o'pka venasidan o'pkaga 7) o'pkadan o'pka venasiga	1, 2, 4, 5	1, 3, 5, 7	3, 4, 6, 7	3, 4, 5, 6	B		\N		f	\N
268	4	18	Hayvon hujayrasidagi ayrim moddalarning hujayradan tashqari va hujayra ichidagi kontsentratsiyasi quyida keltirilgan. Shunga ko’ra, qaysi modda hujayra ichiga kirishi uchun hujayraning tirik bo'lishini talab qiladi?	kaliy	natriy	oqsil	aminokislotalar	C		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-18-media-01.png	glyukoza	t	\N
269	4	19	Quyidagi filogenetik daraxt Mammalia (Sutemizuvchilar) sinfidagi ayrim turlarning tasnif darajalarini ko'rsatadi. Shunga ko'ra, bu organizmlar va ularning tasnifi darajalariga tegishli bo’lgan javobni aniqlang.? I. Bo'rsiq va bo'rilar birgalikda kiritilgan eng kichik sistematik birlik turkumdir; II. Ushbu beshta turning barchasi umumiy genlarga ega bo'lgan yirtqich hayvonlardir; III. Bo'rsiq va qunduz o'rtasidagi qarindoshlik darajasi, shoqol va bo'ri o'rtasidagi qarindoshlik darajasi bilan bir xildir.	faqat I	faqat II	faqat III	I va II	D		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-19-media-01.png	I, II va III	t	\N
270	4	20	Quyidagi grafiklarda tirik organizmlarda sodir bo'ladigan ba'zi biokimyoviy hodisalar ko'rsatilgan. Grafiklarda ko'rsatilgan biokimyoviy hodisalarning qaysi biri o’simliklarda sodir bo’ladi?	Faqat I	II va IV	III va IV	I va III	E		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-20-media-01.png	I,II va III	t	\N
271	4	21	Quyida umurtqali hayvonlarning yopiq qon aylanish tizimining diagrammasi keltirilgan. Ushbu umurtqali hayvon haqidagi quyidagi qaysi gap noto'g'ri?	Jabralar orqali nafas oladi.	Zararli azot mahsulotini ammiak ko’rinishida chiqaradi	Uning yuragida doimo kislorodsiz qon bo'ladi.	Uning tanasi suv o'tkazmaydigan tangachalar bilan qoplangan.	E		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-21-media-01.png	Loviyasimon tana buyraklar orqali keraksiz moddalar chiqadi	t	\N
272	4	22	Ulotriks jinssiz va jinsiy yo'llar bilan ko'paydi.Ushbu jarayonda 500 ta yangi ulotriks ipi hosil bo'ldi.Ko'payishda ishtirok etgan izogametalar zoosporalarning 200 % tashkil qilsa,Ko'payishda ishtirok etgan zoosprolar va izogametalardagi umumiy xivchinlar sonini aniqlang.	600	1200	1000	800	D		\N		f	\N
273	4	23	Jadvaldiga ma'lumotlar ichidan <<ha>> degan javobga mos raqamlarni ajrating	1,4,8	2,4,8	2,3,8	2,4,6	B		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-23-media-01.png		t	\N
274	4	24	Quyidagi grafikda atrof-muhit haroratiga qarab M va N umurtqali hayvonlarning tana haroratining o'zgarishi ko'rsatilgan. Shunga ko'ra, M va N organizmlari haqida qaysi fikrlar to’g’ri.? I. M organizmi toʻrt kamerali yurakka ega; II. N Organizm yopiq qon aylanish sistemasiga ega; III. N Organizm o'pka orqali nafas oladi; IV. M organiz quloq suprasiga ega.	I va II	I va III	II va III	I, II va IV	A		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-24-media-01.png	III va IV	t	\N
275	4	25	Quyidagi grafikda inson kapillyar tomirlarida qon va to'qima suyuqligi o'rtasidagi moddalar almashinuvida rol o'ynaydigan qon bosimi va osmotik bosim qiymatlari berilgan. Xuddi shu odamning qon bosimi qiymati quyidagi grafikda ko'rsatilganidek, bir muncha vaqt o'tgach o'zgarganligi aniqlandi. Bunga ko'ra, ushbu kishi haqida quyidagi fikrlardan qaysilari to'g'ri? I. Uning Qon bosimi oshgan; II. To'qima suyuqligi oldingi holatga qaraganda miqdori oshgan; III. Qon plazmasidagi oqsillar miqdori ortgan. IV. Tuzli ayron ichib, shish paydo bo'lishining oldini olishi mumkin.	I va II	I va III	II va III	III va IV	A		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-25-media-01.png	I,II va III	t	<div class="imported-question-image"><img src="/uploads/6-ta-variant-maxsus-javobli/variant-06/question-25-media-02.png" alt="Question media" style="max-width:100%;height:auto;" /></div>
276	4	26	Qonni sentrofugatsiya qilish natijasida tajriba naychasida quyidagi moddalar taqsimoti kuzatiladi. Tajriba naychasining raqamlangan qismlarida bo'lishi mumkin bo'lgan moddalarni hisobga olsak, quyidagilarning qaysi biri notog'ri berilgan? I – qism II – qism	Antitanacha Eritrotsit	Albumin Karbonat angidraza fermenti	Vitamin Eritrotsit	Gemoglobin Nafas olish fermenti	D		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-26-media-01.png	Garmon Karbonat angidraza fermenti	t	\N
277	4	27	Asalari populyatsiyasida sodir bo'ladigan ko'payish hodisalari quyidagi sxemada ko'rsatilgan.	Partenogenez orqali hosil bo'lgan barcha erkak arilarning genetik tuzilishi bir xildir	Bitta erkak arining barcha spermatozoidlarining genetik tuzilishi bir xildir	Erkak ari gametalarini (spermatozoidlarni) hosil qilayotganda tetrada hosil bo'lishi kuzatilmaydi	Zigotaning gul changi bilan oziqlanishi natijasida hosil bo'lgan ishchi arilar ko'payish jarayonida qatnashmaydi	A		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-27-media-01.png	Urug'lanish natijasida hosil bo'lgan barcha asalari urg'ochidir	t	\N
278	4	28	Tiroksin (a), somatotrop (b) gormonlarining funksiyalarini aniqlang. 1) gipofiz bezidan ishlab chiqariladi 2) tarkibida yod mavjud 3) gipofunksiyasida kretinizmni rivojlanishiga olib keladi 4) kam ishlab chiqarilsa nanizm vujudga keladi 5) bo'y o'sishiga ta'sir qiladi; 6) qalqonsimon bez tomonidan ishlab chiqariladi	a – 2, 6; b – 1, 5	a – 4, 5; b – 3, 6	a – 2, 6; b – 3, 4	a – 3, 5; b – 2, 4	A		\N		f	\N
279	4	29	Umurtqa pog’onasining yarim harakatchan(a) va harakatsiz(b) bo’lgan bo’limlari to’g’ri ko’rsatilgan javobni aniqlang. 1) bo’yin; 2) ko’krak; 3) bel; 4) dumg’aza; 5) dum;	a-4,5; b-1,2,3;	a-1,2,3,5; b-4;	a-1,2,3,5; b-4;	a-1,2,3; b-4,5;	D		\N		f	\N
280	4	30	Baliqlarning yashash muhiti va unga moslanish belgilarini juftlab yozing. a) chuqur suvda;b) suv tubida; d) suv yuzasida; e) korall riflarida. 1) tanasi suyri shaklda ;2) yorug‘lik tarqatuvchi organi bor; 3) tana rangi xilma-xil; 4) tanasi yassi	a2,b4,d1,e3	a3,b4,d1,e2	a2,b4,d3,e1	a3,b1,d4,e2	A		\N		f	\N
281	4	31	To’pgullarida to’g’ri gullar joylashgan ko’p yillik o’simliklarni belgilang. 1) nastarin; 2) olam; 3) sebarga; 4) qurttana; 5) qashqarbe-da; 6) tok; 7) sachratqi; 8) rayhon; 9) achambiti; 10) behi;	2,10;	2,8;	9,4;	2,6;	D		\N		f	\N
282	4	32	Quyidagi jadvalga mos kelmaydigan javobni aniqlang.	a-tireotoksikoz; b-tireotrop	c-nanizm d-androgen	e-qandli diabet a-tetaniya	b-somatotrop d-estrogen	A		\N		t	<html><head></head><body><table class="MsoTableGrid" border="1" cellspacing="0" style="border-collapse:collapse;width:279.2500pt;border:none;\nmso-border-left-alt:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;mso-border-insideh:1.0000pt solid windowtext;mso-border-insidev:1.0000pt solid windowtext;\nmso-padding-alt:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;"><tbody><tr style="height:12.8000pt;"><td width="42" valign="center" style="width:21.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(237,125,49);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p>&nbsp;</o:p></span></p></td><td width="198" valign="center" style="width:99.4000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(237,125,49);"><p class="MsoNormal" style="line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);mso-ansi-font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">Gormon</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);mso-ansi-font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="317" valign="center" style="width:158.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:1.0000pt solid windowtext;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(237,125,49);"><p class="MsoNormal" style="line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);mso-ansi-font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">Gormon bilan bog’liq kasalik</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);mso-ansi-font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td></tr><tr style="height:12.1500pt;"><td width="42" valign="center" style="width:21.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(237,125,49);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">1</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="198" valign="center" style="width:99.4000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(251,228,213);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">Tiroksiz</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="317" valign="center" style="width:158.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(251,228,213);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">kretinizm</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:12.8000pt;"><td width="42" valign="center" style="width:21.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(237,125,49);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">2</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="198" valign="center" style="width:99.4000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(251,228,213);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">Paratgormoni</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="317" valign="center" style="width:158.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(180,198,231);"><p class="MsoNormal" style="line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);mso-ansi-font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">a</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);mso-ansi-font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td></tr><tr style="height:12.8000pt;"><td width="42" valign="center" style="width:21.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(237,125,49);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">3</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="198" valign="center" style="width:99.4000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(180,198,231);"><p class="MsoNormal" style="line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);mso-ansi-font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">b</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);mso-ansi-font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="317" valign="center" style="width:158.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(251,228,213);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">gigantizm</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:12.8000pt;"><td width="42" valign="center" style="width:21.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(237,125,49);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">4</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="198" valign="center" style="width:99.4000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(251,228,213);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">somatotrop</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="317" valign="center" style="width:158.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(180,198,231);"><p class="MsoNormal" style="line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);mso-ansi-font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">c</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);mso-ansi-font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td></tr><tr style="height:12.1500pt;"><td width="42" valign="center" style="width:21.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(237,125,49);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">5</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="198" valign="center" style="width:99.4000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(180,198,231);"><p class="MsoNormal" style="line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);mso-ansi-font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">d</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);mso-ansi-font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td><td width="317" valign="center" style="width:158.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(251,228,213);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">shish</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td></tr><tr style="height:12.8000pt;"><td width="42" valign="center" style="width:21.0500pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:1.0000pt solid windowtext;\nmso-border-left-alt:1.0000pt solid windowtext;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(237,125,49);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">6</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="198" valign="center" style="width:99.4000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(251,228,213);"><p class="MsoNormal" style="line-height:115%;"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;">insulin</span><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);font-size:14.0000pt;mso-font-kerning:0.0000pt;"><o:p></o:p></span></p></td><td width="317" valign="center" style="width:158.8000pt;padding:0.0000pt 5.4000pt 0.0000pt 5.4000pt ;border-left:none;\nmso-border-left-alt:none;border-right:1.0000pt solid windowtext;mso-border-right-alt:1.0000pt solid windowtext;\nborder-top:none;mso-border-top-alt:1.0000pt solid windowtext;border-bottom:1.0000pt solid windowtext;\nmso-border-bottom-alt:1.0000pt solid windowtext;background:rgb(180,198,231);"><p class="MsoNormal" style="line-height:115%;"><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);mso-ansi-font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;">e</span></b><b style="mso-bidi-font-weight:normal"><span style="font-family:'Times New Roman';mso-fareast-font-family:Calibri;line-height:115%;\ncolor:rgb(0,0,0);mso-ansi-font-weight:bold;font-size:14.0000pt;\nmso-font-kerning:0.0000pt;"><o:p></o:p></span></b></p></td></tr></tbody></table></body></html>
283	4	33	Quydagi rasmga xos to’g’ri ma’lumotni aniqlang	Tigmotropizm	Fotonastiya	Fototropizm	Fototaksis	D		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-33-media-01.png		t	\N
284	4	34	Bir yurak siklida yurak mushagida harakatlanuvchi impulslar tana suyuqliklari orqali teriga uzatiladi. Bu to'lqinlar teri yuzasidagi elektrodlar yordamida EKG (elektrokardiogramma) ko'rinishida yozib olinadi. Quyidagi grafikda inson yurak urishini ko'rsatuvchi EKG to'lqinlari berilgan. Grafikda "a" bo'lmachalarning qisqarishini (sistola), "b" esa qorinchalarning qisqarishini (sistola) ko'rsatishini bilgan holda, quyidagi fikrlardan qaysilari to'g'ri? I. "a" bosqichida qon bo'lmachalar ichini to’ldiradi. II. "b" bosqichida qon bosimi maksimal nuqtada bo'ladi. III. Teri orqali tarqaladigan bu to'lqinlarning manbai sinoatrial tugun tomonidan hosil bo'ladigan impulslardir.	Faqat I	Faqat II	Faqat III	II va III	D		/uploads/6-ta-variant-maxsus-javobli/variant-06/question-34-media-01.png	I,II va III	t	\N
285	4	35	Quyidagi keltrilgan organizmlarni ulardan olinadigan gametalar soni kamayib borish tartibida joylashtirligan javobni ko'rsating. 1) AaBbCcDd; 2) AabbCcDD; 3) AAbbCCdd; 4) AaBbCcdd; 5) AABBccDd.	3,5,2,4,1	1,5,4,2,3	1,3,4,5,2	1,4,2,5,3	A	Correct option could not be inferred automatically.	\N		f	\N
286	4	36	Moslashtiring. 1.Ta'limmazmunining ketma-ketligi tamoyili 2.Ta'lim mazmuni muntazamligi tamoyili	ta’limni insonparvarlashtirishdagi to‘siqlarni yo‘qotishga imkon beradi. U ijtimoiy gumanitar va tabiiy-ilmiy bilimlarni birlashtirish, ketma-ketlikni o‘rnatish va fanlararo aloqalarni o‘quvchilarning idrok etishi va amaliy faoliyat metodologiyasining mohiyatini anglab еtishlariga tayanishni talab etadi.	ta’lim mazmunini o‘sib boruvchi yo‘nalishda rejalashtirishdan iborat bo‘lishini anglatadi, bunda birinchi navbatda har bir yangi bilim avvalgisiga tayanadi va undan kelib chiqadi.	o‘rganilayotgan bilimlar va shakllantirilayotgan malakalar va kompetentsiyalarni yagona tizimdagi o‘rni, umumiy o‘rta ta’ lim, barcha o‘quv kurslari va yaxlit mazmunning bir-biriga hamda umuminsoniy, milliy madaniyat tizimi aloqadorlikda ko‘rib chiqishni ko‘zda tutadi.	1a,2b	E		\N	1b,2c	f	\N
287	4	37	O'qituvchi laboratoriya mashg'ulotini qanday qilish kerakligini o'quvchilarga ko'rsatdi.O'quvchilar mashg'ulotni bajarib natijalarni jadval asosida to'ldirishdi Bunda Blum taksonomiyasining qaysi bosqichi namoyon bo'lmoqda?	tahlil	sintez	qo`llash	amaliy	C		\N		f	\N
288	4	38	Oʻqituvchi juda tartibli . U oʻtadigan har bir darsining soniyalarigacha hisob kitob qiladi. Darsning har daqiqasida bolaga nimadir berishga harakat qiladi. Darsning har bir bosqichida yangi bir metod qoʻllaydi. Darsda nimagadir chalgʻish oʻquvchining haqqiga xiyonat qilish deb biladi. Quyida oʻqituvchi Kasb standartining Taʼlim samaradorligini oshirish sohasiga oid qaysi mehnat harakatini bajarmoqda?	Dars maqsadlari asosida oʻquvchilar uchun erishimli vazifalarni belgilash	Dars mavzusiga mos keladigan namoyish va tarqatma materiallardan foydalanish	Darsda vaqtdan oqilona foydalanish		C		\N		f	\N
289	4	39	Mahoratli pedagog qaysi sifatlarga ega bo'lishi kerak? 1.O'qituvchilik kasbiga sadoqat; 2.O'z fanining o'qitish metodikasini mukammal bilishi; 3.pedagogik qobiliyatlarini namoyish eta olishi; 4.O'ta qattiqqo'l bo'lishi va tez-tez jazolab turish tarfdori bo'lish	1,2,3	1,2,4	1,3,4	1,2,3,4	A		\N		f	\N
290	4	40	Moslashtiring. 1) Induksiya 2)Deduksiya 3)Analogiya	alohida hodisa va faktlardan umumiy qoidaga kelinadi.	bu umumiy qoidalardan alohida holatlar uchun xulosa chiqarish usuli.	bunda predmetlar ba'zi belgilarining o'xshashligi bo'yicha bu predmetlar boshqa belgilari bo'yicha ham o'xshash, degan taxminiy xulosa chiqariladi. "Xususiydan xususiyga boradigan", bir konkret faktdan boshqa konkret faktlarga boradigan xulosadir	1a2b3c	D		\N	1c2a3b	f	\N
291	4	41	Inson kapitalini rivojlantirish, oʻqitish va tarbiyalashning klassik va zamonaviy nazariyalari hamda shaxslararo va ijtimoiy aloqa jarayonlari quyidagilardan qaysi biriga tegishli.	o`zlashtirishni baholash va qayta aloqani taqdim etish	ta’lim samaradorligini ta’minlash	o`z-o`zini rivojlantirish va kasbiy o`sish	ta’limfaoliyatini tashkil etish	D		\N		f	\N
292	4	42	Insoniyatni rivojlantirish, o'qitish va tarbiyalashning klassik va zamonaviy nazariyalari o'qituvchi faoliyatining qaysi zaruruiy bilimlarini tashkil etadi?	o`zlashtirishni baholash va qayta aloqani taqdim etish	ta’lim samaradorligini ta’minlash	o`z-o`zini rivojlantirish va kasbiy o`sish	xavfsiz rivojlantiruvchi ta’lim muhitini yaratish	D		\N		f	\N
293	4	43	O'qiuvchining doimiy ravishda fanga oid yangiliklardan, internet manbalaridan foydalanishi, doim izlanuvchan bo'lishi orqali qaysi mehnat harakatlariga muvofiq ish olib borilganligini ko'rish mumkin?	O'z tajribasini namoyish etish uchun ochiq darslarga tayyorgarlik ko'rish	Doimiy ravishda fanga oid adabiyotlar bilan tanishib, yangi bilimlarni amaliyotda qo'llash	O'zining ta'lim faoliyatini yetarlicha baholaydi va kasbiy rivojlanish ehtiyojlarini belgilay oladi	Mustaqil ta'lim rejasini va uni amalga oshirgandan so'ng hisobotni tuzadi	B		\N		f	\N
294	4	44	Ijodkorlik - bu o‘qituvchining ta’lim va tarbiya jarayonida sifat jihatidan yangi, original va takrorlanmas biror ilmiy yangilikni paydo qiluvchi faoliyatidir. O'qituvchi kasbiy faoliyatida qanday ijodkorlik namoyon bo'ladi? 1.Izlanadi 2.Zarur paytda kreativ fikrlaydi 3.Hayot bilan hamnafas faoliyat olib boradi 4.Tanqidiy faoliyat olib boradi	1,2,3	2,3,4	1,2,3,4	1,3,4	A		\N		f	\N
295	4	45	4K modelini nimalar tashkil qiladi? Ketma-ketlikda berilgan javobni belgilang! 1.KREATIV 2.KRITIK 3.KOMBINATORIKA 4.KOMMUNIKATSIYA 5.KOLLOBRATSIYA 6.KOOPERATSIYA	5,4,1,2	3,2,1,4	6,4,2,1	1,2,4,5	A		\N		f	\N
296	4	46	O'quvchilar darsda suvni qaynash haroratini o'lchadilar va jadvalga qayt etib bordilar. Natijalarini ustozga e'lon qildilar. Bunda qaysi metod namoyon bo'lmoqda?	tushuntirish	laborotoriya	amaliy	namoyish	B		\N		f	\N
297	4	47	Matematika darsida o‘qituvchi muammoli vaziyatga duch keldi, ya’ni o‘quvchilar tomonidan kutilmagan savol berildi. O‘qituvchi esa o‘zining intellektual salohiyati asosida bu masalani ijobiy hal eta oldi. Ushbu holatda o‘qituvchida qaysi refleksiya turi namoyon bo‘lmoqda?	kooperativ refleksiya	shaxsiy refleksiya	intellectual refleksiya	kasbiy refleksiya	C		\N		f	\N
298	4	48	Darsda bir o'quvchi jimo'tirmas edi, o'qituvchi sinfdagi barcha o'quvcilarni guruhlarga bo'lib, jim o'tirmaydigan o'quvchini sinfdoshlari bilan guruh bo'lib ishlashga o'rgatdi. Bunda o'qituvchining qanday mehnat harakatlari namoyon bo'lmoqda?	Dars maqsadlari asosida oʻquvchilar uchun erishimli vazifalarni belgilash	Dars mavzusiga mos keladigan namoyish va tarqatma materiallardan foydalanish	Oʻquvchilarning taʼlimiy maqsadlari va yosh xususiyatlariga mos keladigan oʻqitish usullari va yondashuvlarini tanlash	Oʻqitishning faol usullaridan foydalanish (frontal taʼlim ustun boʻla olmaydi)	D		\N		f	\N
299	4	49	O`qituvchi matematika darsida bolalar zerikib qolayotganliklarini sezdi va misollarni "qayiqda suzamiz" o`yinidan foydalandi bunda qaysi metod namoyon bo`lmoqda	suhbat	tasvir	didaktik o`yin	amaliy	C		\N		f	\N
300	4	50	1 -sinf o`qituvchisi bolalarda yozish malakasi yanada shakllantirish uchun qayta - qayta matn, imloga oid mashqlarni yozdirmoqda . bunda o`qituvchi qaysi metoddan foydalanmoqda	suhbat	amaliy	mashq	laborotoriya	C		\N		f	\N
\.


--
-- Data for Name: test_variants; Type: TABLE DATA; Schema: public; Owner: biology_user
--

COPY public.test_variants (id, variant_number, question_ids, total_questions, created_at) FROM stdin;
\.


--
-- Data for Name: tests; Type: TABLE DATA; Schema: public; Owner: biology_user
--

COPY public.tests (id, title, description, duration_minutes, points_per_question, total_questions, allow_retake, is_active, created_at) FROM stdin;
2	Imported 250 Question Bank	Imported from extracted_docx_questions.json	120	2	50	t	t	2026-04-01 04:09:54.151065-05
4	6 ta variant maxsus javobli	Imported from Google Docs HTML: 6 ta variant maxsus javobli.html | 6 variant(s) | 300 total question(s)	120	2	50	t	t	2026-04-01 05:43:39.454984-05
\.


--
-- Data for Name: user_approvals; Type: TABLE DATA; Schema: public; Owner: biology_user
--

COPY public.user_approvals (id, telegram_user_id, username, approved_variants, approved_at, expires_at, status, created_at) FROM stdin;
3	\N	gunm	\N	2026-04-01 03:42:19.028166-05	\N	approved	2026-04-01 03:42:19.030248-05
5	\N	asd4	\N	\N	\N	pending	2026-04-01 07:27:47.801865-05
6	\N	Asadbeksayidahmadov	\N	\N	\N	pending	2026-04-01 09:25:10.909003-05
7	\N	asder	\N	\N	\N	pending	2026-04-01 09:28:40.437203-05
4	\N	asd	{2,5}	2026-04-01 09:35:34.934399-05	2026-04-01 12:05:34.934407-05	approved	2026-04-01 04:13:42.049738-05
8	\N	adafdf	\N	\N	\N	pending	2026-04-01 09:35:52.832354-05
9	\N	drtyfgvuhbj	\N	\N	\N	pending	2026-04-01 10:05:25.390547-05
10	\N	szdfxcg	\N	\N	\N	pending	2026-04-01 10:11:05.856624-05
11	\N	ozod1	\N	\N	\N	pending	2026-04-01 10:12:33.569904-05
12	\N	boryabdimixabar	\N	\N	\N	pending	2026-04-01 10:13:57.868638-05
13	\N	Asadbek_sayidahmadov	{1}	2026-04-01 10:16:22.272426-05	2026-04-01 12:46:22.272435-05	approved	2026-04-01 10:14:44.01819-05
\.


--
-- Data for Name: user_variant_permissions; Type: TABLE DATA; Schema: public; Owner: biology_user
--

COPY public.user_variant_permissions (id, user_id, variant_id) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: biology_user
--

COPY public.users (id, username, password_hash, role, is_approved, is_rejected, created_at, session_expires_at, approval_requested_at, allowed_variant_index, allowed_variants_all, can_create_exam, can_access_all_tests, telegram_user_id, approved_at, allowed_variants) FROM stdin;
24	ssss	$2b$12$.qiraLaZ2eZ4emQAnkuyWu1SDvZ78pWtMAMyQpoAzvjhy2amxKnWi	student	f	t	2026-03-31 01:27:04.227871-05	\N	\N	\N	f	f	f	\N	\N	\N
25	qwq	$2b$12$axCTIUwLl/R7MJ3oF48VLe.ptZ4Z03UBNSBqw3ZBh5N4mQ7HMDF9K	student	t	f	2026-03-31 01:27:37.254163-05	2026-03-31 04:00:10.040462-05	\N	\N	f	f	f	\N	\N	\N
9		$2b$12$0yX7rjRaeUnCwvLmBnZn9.GJJz0y25leZR5EdO.95Kwh.3HcLTg8C	student	f	t	2026-03-28 13:30:02.54779-05	\N	\N	\N	f	f	f	\N	\N	\N
27	cccca	$2b$12$H4wvZPC0nj1TAKrs8wdA5u.QgonCay3dag9asnflXegQIYd7/8NW.	student	t	f	2026-03-31 01:43:38.813011-05	\N	\N	\N	f	f	f	\N	\N	\N
29	1234	$2b$12$EFFAAoBDcSuZchrYFfcVWuwmxpCT9ZGNC4OXimbSpS0gnXUd78eha	student	f	f	2026-04-01 02:29:11.148811-05	\N	2026-04-01 02:29:11.147429-05	\N	f	f	f	\N	\N	\N
35	Asadbeksayidahmadov	$2b$12$lJN0YYbfAS2mOqKykG6y7OAtzDPvIZr49c7Bl9WY4EugstxJedxeS	student	f	f	2026-04-01 09:25:10.907994-05	\N	\N	\N	f	f	f	\N	\N	\N
21	azoda	$2b$12$.Aro3Z0aWdJJbo4UZzVsn.vq.HOxrzGOGjezV7T5aRRocAxqQk4YK	student	t	f	2026-03-30 01:38:59.333342-05	\N	\N	1	f	f	f	\N	\N	\N
37	adafdf	$2b$12$OKaRwlk0oGeMCOQolc2YVO6zhLGoYXq/.G4JOMbWW53igdO4lzoO2	student	f	f	2026-04-01 09:35:52.831474-05	\N	\N	\N	f	f	f	\N	\N	\N
6	asna	$2b$12$7IbxIQV/HGqJYo6aaBiXM.Hb8FZ8SrhNjLSWiaSWoKw9.o2OqPFY6	student	t	f	2026-03-28 10:03:00.729588-05	\N	\N	\N	f	f	f	\N	\N	\N
7	aaaa	$2b$12$.oTo26lwKaTYJMtmgY4RIeMgvcvPbocy1VYUDqTBixnUXmYs22TBS	student	t	f	2026-03-28 10:06:51.912454-05	\N	\N	\N	f	f	f	\N	\N	\N
8	asadbek	$2b$12$VbMreXFWu9M39Un24mEsrek60ApxW0mrhUTWXLA2qwIeATNpPrwaS	student	t	f	2026-03-28 10:09:06.008933-05	\N	\N	\N	f	f	f	\N	\N	\N
10	bek	$2b$12$4COKTIjNEuES8dvzCizB.OQa7V5boqNFTtbnTPKoDS8vQrJCe3qQi	student	t	f	2026-03-28 14:12:38.116812-05	\N	\N	\N	f	f	f	\N	\N	\N
14	asadbek1	$2b$12$UHAui6VEKjqj0nfxO9uroeeVNltfZMH73KQTB2iWXpAg/0jY5EN2e	student	t	f	2026-03-29 02:09:47.388302-05	\N	\N	\N	f	f	f	\N	\N	\N
17	asdfg	$2b$12$vOEvgtRG2yy4jp9Rhzi.3eLKo3HvoEmElrsgpiSYYwmZuye0Nlb82	student	f	t	2026-03-29 14:29:28.978515-05	\N	\N	\N	f	f	f	\N	\N	\N
1	telegram_admin	$2b$12$WixcQY4jgspJwoOv1gHY6.w1T/EHKev0Vm9RO4c2g5w.H9pOTunZ2	admin	t	f	2026-03-28 09:30:47.809684-05	\N	\N	\N	t	t	t	\N	\N	\N
39	szdfxcg	$2b$12$aWhyfo9QmxT4175Uqs9GsO1he8lb3K8iKCVCUnjim9UOX6Bxoqgry	student	f	f	2026-04-01 10:11:05.85539-05	\N	\N	\N	f	f	f	\N	\N	\N
40	ozod1	$2b$12$jKJAGvbVuQwVm/pNGbmu0.JxOou1boA1.4wjKGCws8ItpdAZSS4zO	student	f	f	2026-04-01 10:12:33.568265-05	\N	\N	\N	f	f	f	\N	\N	\N
41	boryabdimixabar	$2b$12$eqINqMNIMzr6Hd7Ibgk7A.PdDJFQVWC42NrGpPKBM9TQrkr4CSgl.	student	f	f	2026-04-01 10:13:57.868068-05	\N	\N	\N	f	f	f	\N	\N	\N
42	Asadbek_sayidahmadov	$2b$12$9jkX3xbwR/KSjA3DvN1o0OE3ZzCVASDfh8SX4nbQExCxzrfUmY9xC	student	t	f	2026-04-01 10:14:44.017777-05	2026-04-01 12:46:22.272435-05	2026-04-01 10:16:22.272426-05	\N	f	f	f	\N	2026-04-01 10:16:22.272426-05	{1}
5	asn	$2b$12$EGlR8tIdUIVNj3GOb1YQc.JOY/5wraFb3oqhnTt9lPfuQiaZq5x0W	student	f	t	2026-03-28 09:55:50.821982-05	\N	\N	\N	f	f	f	\N	\N	\N
18	asdfgh	$2b$12$zh.BkBlw6BexWU3honY1fu7epo6J3WtB1yK2ct/c9jIFmBu/NxFpS	student	f	t	2026-03-29 23:59:37.591773-05	\N	\N	\N	f	f	f	\N	\N	\N
19	asx	$2b$12$sZly9HbAtghUpcA6FhjH4.n1J9KsgXcAcDEmP1FjJqdh75bb3rl7S	student	f	t	2026-03-30 00:08:57.433532-05	\N	\N	\N	f	f	f	\N	\N	\N
23	kkkk	$2b$12$33OdQJ04yx1/wgsXSgGGN.5IZ9JDUXUqDvODJRxrIojxvtoXmmt/a	student	t	f	2026-03-31 01:24:16.957321-05	\N	\N	\N	f	f	f	\N	\N	\N
11	asd	$2b$12$1f8IO53VZ0Jhk7u/EpVsTO0XmfjjvVYVxf8WE0NmV8HMnTKlf2hDK	student	t	f	2026-03-28 14:21:26.782665-05	2026-04-01 12:05:34.934407-05	2026-04-01 09:35:34.934399-05	2	f	f	f	\N	2026-04-01 09:35:34.934399-05	{2,5}
38	drtyfgvuhbj	$2b$12$Vc8bqSW/TVeiVbWa5OnGx.oKCy9s7m.mzxLKPQGsHx9UGWYyAS8qm	student	f	f	2026-04-01 10:05:25.389874-05	\N	\N	\N	f	f	f	\N	\N	\N
26	asdq	$2b$12$eqSeAVetGZIfpbt35YzwwePmoM7ZUUIypvWkprD5RX3UA8bsv4Mp.	student	t	f	2026-03-31 01:30:55.597615-05	\N	\N	\N	f	f	f	\N	\N	\N
15	asadbek5	$2b$12$sT5ZV76WYzAyTop.pSkY6efitqabXMUIJatpgkBHVDxAJOH167J52	student	t	f	2026-03-29 02:17:36.84952-05	\N	\N	\N	f	f	f	\N	\N	\N
16	ozod	$2b$12$XyRdNXp1ATLjF19Atq6O9OgrHI12vRlMcOYGVgwKCqU/YA6i96S7S	student	t	f	2026-03-29 02:30:18.883022-05	\N	\N	\N	f	f	f	\N	\N	\N
13	asdf	$2b$12$dTaHwUeRvhQ/1h2i81Ex2.87dnrcuawqhuqhUMT8.onp.ELaCLFsi	student	t	f	2026-03-28 15:04:26.666764-05	\N	\N	\N	t	f	f	\N	\N	\N
20	azs	$2b$12$r3ZwKLkDLVERuUr1RtjJB.4yPLOo.5ZonGZQ6e5EQ0bmjiFI4DjlC	student	t	f	2026-03-30 00:09:11.126043-05	\N	\N	\N	t	f	f	\N	\N	\N
2	asddabej	$2b$12$Ny1LUwT6SHgPcdLpE9.8GOHA.updd7RpcFsFN.tmudxOTEVk.4g1e	student	t	f	2026-03-28 09:46:48.32448-05	\N	\N	\N	f	f	f	\N	\N	\N
3	Asadbek	$2b$12$vACVYx.fR/C5rgfdigfrmOZfYmEXEI0MTJUHYoFLAzFpCH9wvKve.	student	t	f	2026-03-28 09:47:06.898058-05	\N	\N	\N	f	f	f	\N	\N	\N
4	Asad	$2b$12$kOnkGdo.77Wns1iNTsVVAuHdNoRdkMLfoU1CFSIBFs5pNH9dctQ.O	student	t	f	2026-03-28 09:53:20.662913-05	\N	\N	\N	f	f	f	\N	\N	\N
12	asda	$2b$12$gp/pp8ce2Kvijt4DhIKdR.YXUSrenYYfjh8L676s.CPjU3EHoXVXu	student	t	f	2026-03-28 15:04:17.768433-05	\N	\N	\N	f	f	f	\N	\N	\N
28	asd1	$2b$12$A59M/iL8.Gi94wtRCuGRku0ZZ8UwQZ1xVKGkb2tZ2QXYffOko6p/y	student	f	f	2026-04-01 02:26:04.024198-05	\N	2026-04-01 02:26:04.022734-05	\N	f	f	f	\N	\N	\N
30	llll	$2b$12$3UuyXkm5dGmOMH..z5PqBud/uFT8Cifxg.aEuoKnke0QkZ1d9Ca.G	student	f	f	2026-04-01 02:37:13.157908-05	\N	2026-04-01 02:37:13.156662-05	\N	f	f	f	\N	\N	\N
33	gunm	$2b$12$hfVw6GPu89Wv7T3JUjCQsuUOWr81jyTjjb2odkZB0kFQGB/b6k0d2	student	t	f	2026-04-01 03:42:19.029192-05	2026-04-01 05:18:48.963707-05	2026-04-01 03:42:19.026281-05	\N	f	f	f	\N	\N	\N
22	qqqq	$2b$12$ZVio.Y1zsXEEIAxP6kMaOO8UagwqqmoNy0ndfiUH4.uUEd.ORehZK	student	t	f	2026-03-31 01:23:36.14933-05	\N	\N	\N	f	f	f	\N	\N	\N
34	asd4	$2b$12$PIoG.Pw5CaJcCCbpfq477OYkZUVx7G0ONm4uzuKHxwCNzEBymw2d6	student	f	f	2026-04-01 07:27:47.791336-05	\N	\N	\N	f	f	f	\N	\N	\N
36	asder	$2b$12$iOsFQBkDg11lBUlXZrAWBO83ZMO8t1FkKI6Zun6/aFGtGeIRVGkHy	student	f	f	2026-04-01 09:28:40.435903-05	\N	\N	\N	f	f	f	\N	\N	\N
\.


--
-- Data for Name: variant_questions; Type: TABLE DATA; Schema: public; Owner: biology_user
--

COPY public.variant_questions (id, variant_id, question_id, order_index) FROM stdin;
551	12	237	1
552	12	80	2
553	12	221	3
554	12	33	4
555	12	66	5
556	12	152	6
557	12	119	7
558	12	230	8
559	12	164	9
560	12	177	10
561	12	139	11
562	12	171	12
563	12	89	13
564	12	240	14
565	12	6	15
566	12	58	16
567	12	14	17
568	12	155	18
569	12	250	19
570	12	147	20
571	12	217	21
572	12	55	22
573	12	175	23
574	12	87	24
575	12	281	25
576	12	195	26
577	12	186	27
578	12	242	28
579	12	29	29
580	12	203	30
581	12	85	31
582	12	48	32
583	12	27	33
584	12	128	34
585	12	251	35
586	12	5	36
587	12	130	37
588	12	148	38
589	12	95	39
590	12	192	40
591	12	172	41
592	12	286	42
593	12	72	43
594	12	153	44
595	12	170	45
596	12	226	46
597	12	156	47
598	12	218	48
599	12	190	49
600	12	61	50
601	13	68	1
602	13	43	2
603	13	36	3
604	13	26	4
605	13	67	5
606	13	201	6
607	13	199	7
608	13	22	8
609	13	145	9
610	13	76	10
611	13	131	11
612	13	263	12
613	13	114	13
614	13	173	14
615	13	206	15
616	13	225	16
617	13	12	17
618	13	93	18
619	13	178	19
620	13	197	20
621	13	60	21
622	13	97	22
623	13	24	23
624	13	295	24
625	13	220	25
626	13	125	26
627	13	120	27
628	13	34	28
629	13	126	29
630	13	9	30
631	13	292	31
632	13	69	32
633	13	214	33
634	13	141	34
635	13	280	35
636	13	167	36
637	13	168	37
638	13	180	38
639	13	262	39
640	13	98	40
641	13	62	41
642	13	209	42
643	13	239	43
644	13	56	44
645	13	185	45
646	13	283	46
647	13	261	47
648	13	212	48
649	13	189	49
650	13	101	50
651	15	228	1
652	15	254	2
653	15	183	3
654	15	278	4
655	15	70	5
656	15	109	6
657	15	99	7
658	15	54	8
659	15	39	9
660	15	42	10
661	15	267	11
662	15	246	12
663	15	104	13
664	15	115	14
665	15	198	15
666	15	142	16
667	15	165	17
668	15	79	18
669	15	13	19
670	15	45	20
671	15	174	21
672	15	274	22
673	15	300	23
674	15	210	24
675	15	272	25
676	15	159	26
677	15	193	27
678	15	28	28
679	15	277	29
680	15	137	30
681	15	81	31
682	15	46	32
683	15	231	33
684	15	63	34
685	15	154	35
686	15	297	36
687	15	204	37
688	15	222	38
689	15	100	39
690	15	187	40
691	15	244	41
692	15	233	42
693	15	299	43
694	15	112	44
695	15	200	45
696	15	90	46
697	15	118	47
698	15	219	48
699	15	247	49
700	15	235	50
701	16	15	1
702	16	1	2
703	16	282	3
704	16	268	4
705	16	291	5
706	16	105	6
707	16	129	7
708	16	2	8
709	16	184	9
710	16	49	10
711	16	181	11
712	16	77	12
713	16	245	13
714	16	20	14
715	16	11	15
716	16	23	16
717	16	179	17
718	16	182	18
719	16	50	19
720	16	44	20
721	16	57	21
722	16	188	22
723	16	243	23
724	16	91	24
725	16	75	25
726	16	248	26
727	16	296	27
728	16	83	28
729	16	151	29
730	16	111	30
731	16	124	31
732	16	7	32
733	16	196	33
734	16	133	34
735	16	253	35
736	16	255	36
737	16	113	37
738	16	106	38
739	16	122	39
740	16	94	40
741	16	41	41
742	16	163	42
743	16	269	43
744	16	205	44
745	16	31	45
746	16	51	46
747	16	107	47
748	16	78	48
749	16	290	49
750	16	287	50
751	17	202	1
752	17	293	2
753	17	146	3
754	17	40	4
755	17	298	5
756	17	227	6
757	17	213	7
758	17	279	8
759	17	157	9
760	17	258	10
761	17	84	11
762	17	86	12
763	17	117	13
764	17	276	14
765	17	176	15
766	17	8	16
767	17	25	17
768	17	160	18
769	17	108	19
770	17	38	20
771	17	289	21
772	17	191	22
773	17	207	23
774	17	35	24
775	17	134	25
776	17	64	26
777	17	47	27
778	17	236	28
779	17	19	29
780	17	144	30
781	17	18	31
782	17	73	32
783	17	264	33
784	17	232	34
785	17	241	35
786	17	161	36
787	17	132	37
788	17	37	38
789	17	271	39
790	17	96	40
791	17	52	41
792	17	260	42
793	17	17	43
794	17	162	44
795	17	223	45
796	17	234	46
797	17	285	47
798	17	92	48
799	17	238	49
800	17	116	50
301	7	52	1
302	7	24	2
303	7	58	3
304	7	259	4
305	7	290	5
306	7	1	6
307	7	279	7
308	7	94	8
309	7	47	9
310	7	201	10
311	7	268	11
312	7	109	12
313	7	25	13
314	7	271	14
315	7	281	15
316	7	14	16
317	7	257	17
318	7	6	18
319	7	218	19
320	7	87	20
321	7	103	21
322	7	157	22
323	7	154	23
324	7	18	24
325	7	7	25
326	7	54	26
327	7	225	27
328	7	99	28
329	7	267	29
330	7	188	30
331	7	34	31
332	7	152	32
333	7	277	33
334	7	108	34
335	7	202	35
336	7	20	36
337	7	45	37
338	7	272	38
339	7	177	39
340	7	80	40
341	7	178	41
342	7	296	42
343	7	287	43
344	7	89	44
345	7	217	45
346	7	205	46
347	7	198	47
348	7	245	48
349	7	231	49
350	7	280	50
351	8	76	1
352	8	4	2
353	8	85	3
354	8	210	4
355	8	212	5
356	8	67	6
357	8	50	7
358	8	53	8
359	8	223	9
360	8	40	10
361	8	299	11
362	8	46	12
363	8	155	13
364	8	229	14
365	8	269	15
366	8	266	16
367	8	78	17
368	8	276	18
369	8	5	19
370	8	15	20
371	8	285	21
372	8	293	22
373	8	258	23
374	8	59	24
375	8	13	25
376	8	164	26
377	8	12	27
378	8	150	28
379	8	159	29
380	8	282	30
381	8	139	31
382	8	62	32
383	8	143	33
384	8	192	34
385	8	265	35
386	8	38	36
387	8	92	37
388	8	140	38
389	8	131	39
390	8	153	40
391	8	274	41
392	8	110	42
393	8	19	43
394	8	147	44
395	8	275	45
396	8	182	46
397	8	286	47
398	8	35	48
399	8	96	49
400	8	73	50
401	9	63	1
402	9	239	2
403	9	79	3
404	9	75	4
405	9	42	5
406	9	214	6
407	9	129	7
408	9	220	8
409	9	125	9
410	9	224	10
411	9	113	11
412	9	98	12
413	9	27	13
414	9	105	14
415	9	289	15
416	9	68	16
417	9	123	17
418	9	128	18
419	9	148	19
420	9	104	20
421	9	174	21
422	9	29	22
423	9	158	23
424	9	134	24
425	9	56	25
426	9	16	26
427	9	213	27
428	9	137	28
429	9	227	29
430	9	295	30
431	9	119	31
432	9	82	32
433	9	232	33
434	9	156	34
435	9	74	35
436	9	204	36
437	9	165	37
438	9	252	38
439	9	173	39
440	9	124	40
441	9	161	41
442	9	255	42
443	9	116	43
444	9	211	44
445	9	77	45
446	9	291	46
447	9	10	47
448	9	21	48
449	9	195	49
450	9	97	50
451	10	206	1
452	10	234	2
453	10	233	3
454	10	194	4
455	10	127	5
456	10	23	6
457	10	196	7
458	10	36	8
459	10	55	9
460	10	197	10
461	10	166	11
462	10	264	12
463	10	187	13
464	10	2	14
465	10	215	15
466	10	149	16
467	10	88	17
468	10	228	18
469	10	91	19
470	10	183	20
471	10	135	21
472	10	191	22
473	10	237	23
474	10	8	24
475	10	175	25
476	10	32	26
477	10	66	27
478	10	136	28
479	10	9	29
480	10	61	30
481	10	230	31
482	10	179	32
483	10	84	33
484	10	151	34
485	10	263	35
486	10	203	36
487	10	248	37
488	10	200	38
489	10	93	39
490	10	31	40
491	10	138	41
492	10	216	42
493	10	69	43
494	10	270	44
495	10	43	45
496	10	185	46
497	10	292	47
498	10	249	48
499	10	49	49
500	10	238	50
501	11	167	1
502	11	115	2
503	11	133	3
504	11	48	4
505	11	169	5
506	11	141	6
507	11	246	7
508	11	114	8
509	11	162	9
510	11	100	10
511	11	242	11
512	11	219	12
513	11	37	13
514	11	251	14
515	11	65	15
516	11	122	16
517	11	33	17
518	11	236	18
519	11	283	19
520	11	39	20
521	11	106	21
522	11	41	22
523	11	189	23
524	11	22	24
525	11	44	25
526	11	253	26
527	11	107	27
528	11	72	28
529	11	184	29
530	11	146	30
531	11	101	31
532	11	118	32
533	11	171	33
534	11	132	34
535	11	261	35
536	11	221	36
537	11	117	37
538	11	26	38
539	11	222	39
540	11	142	40
541	11	60	41
542	11	288	42
543	11	262	43
544	11	90	44
545	11	244	45
546	11	170	46
547	11	70	47
548	11	102	48
549	11	193	49
550	11	199	50
\.


--
-- Data for Name: variants; Type: TABLE DATA; Schema: public; Owner: biology_user
--

COPY public.variants (id, test_id, variant_number) FROM stdin;
7	4	1
8	4	2
9	4	3
10	4	4
11	4	5
12	2	1
13	2	2
15	2	3
16	2	4
17	2	5
\.


--
-- Name: answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: biology_user
--

SELECT pg_catalog.setval('public.answers_id_seq', 1247, true);


--
-- Name: attempt_answers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: biology_user
--

SELECT pg_catalog.setval('public.attempt_answers_id_seq', 59, true);


--
-- Name: attempt_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: biology_user
--

SELECT pg_catalog.setval('public.attempt_questions_id_seq', 900, true);


--
-- Name: attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: biology_user
--

SELECT pg_catalog.setval('public.attempts_id_seq', 19, true);


--
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: biology_user
--

SELECT pg_catalog.setval('public.questions_id_seq', 300, true);


--
-- Name: test_variants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: biology_user
--

SELECT pg_catalog.setval('public.test_variants_id_seq', 1, false);


--
-- Name: tests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: biology_user
--

SELECT pg_catalog.setval('public.tests_id_seq', 4, true);


--
-- Name: user_approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: biology_user
--

SELECT pg_catalog.setval('public.user_approvals_id_seq', 13, true);


--
-- Name: user_variant_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: biology_user
--

SELECT pg_catalog.setval('public.user_variant_permissions_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: biology_user
--

SELECT pg_catalog.setval('public.users_id_seq', 42, true);


--
-- Name: variant_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: biology_user
--

SELECT pg_catalog.setval('public.variant_questions_id_seq', 800, true);


--
-- Name: variants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: biology_user
--

SELECT pg_catalog.setval('public.variants_id_seq', 17, true);


--
-- Name: answers answers_pkey; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_pkey PRIMARY KEY (id);


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: attempt_answers attempt_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.attempt_answers
    ADD CONSTRAINT attempt_answers_pkey PRIMARY KEY (id);


--
-- Name: attempt_questions attempt_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.attempt_questions
    ADD CONSTRAINT attempt_questions_pkey PRIMARY KEY (id);


--
-- Name: attempts attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: test_variants test_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.test_variants
    ADD CONSTRAINT test_variants_pkey PRIMARY KEY (id);


--
-- Name: tests tests_pkey; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.tests
    ADD CONSTRAINT tests_pkey PRIMARY KEY (id);


--
-- Name: answers uq_answers_question_option; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT uq_answers_question_option UNIQUE (question_id, option_label);


--
-- Name: attempt_answers uq_attempt_question; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.attempt_answers
    ADD CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id);


--
-- Name: variants uq_test_variant_number; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT uq_test_variant_number UNIQUE (test_id, variant_number);


--
-- Name: user_variant_permissions uq_user_variant_permission; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.user_variant_permissions
    ADD CONSTRAINT uq_user_variant_permission UNIQUE (user_id, variant_id);


--
-- Name: variant_questions uq_variant_question_link; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.variant_questions
    ADD CONSTRAINT uq_variant_question_link UNIQUE (variant_id, question_id);


--
-- Name: user_approvals user_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.user_approvals
    ADD CONSTRAINT user_approvals_pkey PRIMARY KEY (id);


--
-- Name: user_variant_permissions user_variant_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.user_variant_permissions
    ADD CONSTRAINT user_variant_permissions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_telegram_user_id_key; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_user_id_key UNIQUE (telegram_user_id);


--
-- Name: variant_questions variant_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.variant_questions
    ADD CONSTRAINT variant_questions_pkey PRIMARY KEY (id);


--
-- Name: variants variants_pkey; Type: CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT variants_pkey PRIMARY KEY (id);


--
-- Name: ix_answers_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_answers_id ON public.answers USING btree (id);


--
-- Name: ix_answers_question_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_answers_question_id ON public.answers USING btree (question_id);


--
-- Name: ix_approvals_approval_type; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_approvals_approval_type ON public.approvals USING btree (approval_type);


--
-- Name: ix_approvals_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_approvals_id ON public.approvals USING btree (id);


--
-- Name: ix_approvals_status; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_approvals_status ON public.approvals USING btree (status);


--
-- Name: ix_approvals_telegram_user_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_approvals_telegram_user_id ON public.approvals USING btree (telegram_user_id);


--
-- Name: ix_approvals_test_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_approvals_test_id ON public.approvals USING btree (test_id);


--
-- Name: ix_approvals_user_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_approvals_user_id ON public.approvals USING btree (user_id);


--
-- Name: ix_approvals_username; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_approvals_username ON public.approvals USING btree (username);


--
-- Name: ix_attempt_answers_attempt_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_attempt_answers_attempt_id ON public.attempt_answers USING btree (attempt_id);


--
-- Name: ix_attempt_answers_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_attempt_answers_id ON public.attempt_answers USING btree (id);


--
-- Name: ix_attempt_answers_question_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_attempt_answers_question_id ON public.attempt_answers USING btree (question_id);


--
-- Name: ix_attempt_questions_attempt_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_attempt_questions_attempt_id ON public.attempt_questions USING btree (attempt_id);


--
-- Name: ix_attempt_questions_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_attempt_questions_id ON public.attempt_questions USING btree (id);


--
-- Name: ix_attempt_questions_question_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_attempt_questions_question_id ON public.attempt_questions USING btree (question_id);


--
-- Name: ix_attempts_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_attempts_id ON public.attempts USING btree (id);


--
-- Name: ix_attempts_test_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_attempts_test_id ON public.attempts USING btree (test_id);


--
-- Name: ix_attempts_user_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_attempts_user_id ON public.attempts USING btree (user_id);


--
-- Name: ix_questions_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_questions_id ON public.questions USING btree (id);


--
-- Name: ix_questions_test_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_questions_test_id ON public.questions USING btree (test_id);


--
-- Name: ix_test_variants_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_test_variants_id ON public.test_variants USING btree (id);


--
-- Name: ix_test_variants_variant_number; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE UNIQUE INDEX ix_test_variants_variant_number ON public.test_variants USING btree (variant_number);


--
-- Name: ix_tests_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_tests_id ON public.tests USING btree (id);


--
-- Name: ix_user_approvals_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_user_approvals_id ON public.user_approvals USING btree (id);


--
-- Name: ix_user_approvals_telegram_user_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE UNIQUE INDEX ix_user_approvals_telegram_user_id ON public.user_approvals USING btree (telegram_user_id);


--
-- Name: ix_user_approvals_username; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_user_approvals_username ON public.user_approvals USING btree (username);


--
-- Name: ix_user_variant_permissions_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_user_variant_permissions_id ON public.user_variant_permissions USING btree (id);


--
-- Name: ix_user_variant_permissions_user_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_user_variant_permissions_user_id ON public.user_variant_permissions USING btree (user_id);


--
-- Name: ix_user_variant_permissions_variant_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_user_variant_permissions_variant_id ON public.user_variant_permissions USING btree (variant_id);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: ix_variant_questions_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_variant_questions_id ON public.variant_questions USING btree (id);


--
-- Name: ix_variant_questions_question_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_variant_questions_question_id ON public.variant_questions USING btree (question_id);


--
-- Name: ix_variant_questions_variant_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_variant_questions_variant_id ON public.variant_questions USING btree (variant_id);


--
-- Name: ix_variants_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_variants_id ON public.variants USING btree (id);


--
-- Name: ix_variants_test_id; Type: INDEX; Schema: public; Owner: biology_user
--

CREATE INDEX ix_variants_test_id ON public.variants USING btree (test_id);


--
-- Name: answers answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: approvals approvals_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;


--
-- Name: approvals approvals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: attempt_answers attempt_answers_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.attempt_answers
    ADD CONSTRAINT attempt_answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;


--
-- Name: attempt_answers attempt_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.attempt_answers
    ADD CONSTRAINT attempt_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: attempt_questions attempt_questions_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.attempt_questions
    ADD CONSTRAINT attempt_questions_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;


--
-- Name: attempt_questions attempt_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.attempt_questions
    ADD CONSTRAINT attempt_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: attempts attempts_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;


--
-- Name: attempts attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: questions questions_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;


--
-- Name: user_variant_permissions user_variant_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.user_variant_permissions
    ADD CONSTRAINT user_variant_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_variant_permissions user_variant_permissions_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.user_variant_permissions
    ADD CONSTRAINT user_variant_permissions_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id) ON DELETE CASCADE;


--
-- Name: variant_questions variant_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.variant_questions
    ADD CONSTRAINT variant_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: variant_questions variant_questions_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.variant_questions
    ADD CONSTRAINT variant_questions_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id) ON DELETE CASCADE;


--
-- Name: variants variants_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: biology_user
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT variants_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO biology_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO biology_user;


--
-- PostgreSQL database dump complete
--

\unrestrict 9RGz2ewCxN1xiNJcdCXsoV8fzXTUab5uezNpSb4UeWWaSbFleWny4K9MFzM2bti

