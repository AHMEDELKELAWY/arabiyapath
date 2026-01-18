import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Lesson {
  id: string;
  title: string;
}

// Translation mapping for common Arabic lesson titles
const translationMap: Record<string, string> = {
  // Greetings Unit
  "السلام عليكم": "Peace Be Upon You",
  "وعليكم السلام": "And Upon You Peace",
  "كيف حالك؟": "How Are You?",
  "ما اسمك؟": "What Is Your Name?",
  "أنا من...": "I Am From...",
  "تشرفنا": "Nice to Meet You",
  "أهلاً وسهلاً": "Welcome",
  "مع السلامة": "Goodbye",
  "صباح الخير": "Good Morning",
  "مساء الخير": "Good Evening",
  "تصبح على خير": "Good Night",
  "إلى اللقاء": "See You Later",
  "عفواً": "Excuse Me",
  "شكراً جزيلاً": "Thank You Very Much",
  "حوار التعارف": "Introduction Dialogue",
  
  // Alphabet Unit
  "الألف والباء": "Alif and Ba",
  "التاء والثاء": "Ta and Tha",
  "الجيم والحاء والخاء": "Jim, Ha, and Kha",
  "الدال والذال": "Dal and Dhal",
  "الراء والزاي": "Ra and Zay",
  "السين والشين": "Sin and Shin",
  "الصاد والضاد": "Sad and Dad",
  "الطاء والظاء": "Ta and Dha",
  "العين والغين": "Ayn and Ghayn",
  "الفاء والقاف": "Fa and Qaf",
  "الكاف واللام": "Kaf and Lam",
  "الميم والنون": "Mim and Nun",
  "الهاء والواو والياء": "Ha, Waw, and Ya",
  "الحركات والتنوين": "Vowels and Tanween",
  "كتابة الحروف": "Writing the Letters",
  
  // Numbers Unit
  "الأرقام ١-١٠": "Numbers 1-10",
  "الأرقام ١١-٢٠": "Numbers 11-20",
  "العشرات": "Tens",
  "المئات": "Hundreds",
  "الأرقام الترتيبية": "Ordinal Numbers",
  "الساعة والوقت": "Time and Clock",
  "العمليات الحسابية": "Mathematical Operations",
  "الأعداد والمعدود": "Numbers and Counted Nouns",
  "التواريخ": "Dates",
  "الأسعار": "Prices",
  "قياس الكميات": "Measuring Quantities",
  "أرقام الهاتف": "Phone Numbers",
  "العمر والسنوات": "Age and Years",
  "تمارين الأرقام": "Number Exercises",
  "حوار الأرقام": "Numbers Dialogue",
  
  // Family Unit
  "الأب والأم": "Father and Mother",
  "الإخوة والأخوات": "Brothers and Sisters",
  "الأجداد": "Grandparents",
  "الأعمام والعمات": "Uncles and Aunts (Paternal)",
  "الأخوال والخالات": "Uncles and Aunts (Maternal)",
  "أبناء العم والخال": "Cousins",
  "الزوج والزوجة": "Husband and Wife",
  "الأبناء والبنات": "Sons and Daughters",
  "العائلة الممتدة": "Extended Family",
  "شجرة العائلة": "Family Tree",
  "صفات العائلة": "Family Descriptions",
  "في البيت": "At Home",
  "مناسبات عائلية": "Family Occasions",
  "حوار عائلي": "Family Dialogue",
  "وصف العائلة": "Describing Family",
  
  // Food Unit
  "الخبز والحبوب": "Bread and Grains",
  "اللحوم والأسماك": "Meat and Fish",
  "الخضروات": "Vegetables",
  "الفواكه": "Fruits",
  "منتجات الألبان": "Dairy Products",
  "المشروبات": "Beverages",
  "الحلويات": "Desserts",
  "التوابل والبهارات": "Spices and Seasonings",
  "أدوات المطبخ": "Kitchen Utensils",
  "الطهي والوصفات": "Cooking and Recipes",
  "في المطعم": "At the Restaurant",
  "طلب الطعام": "Ordering Food",
  "الأطعمة العربية": "Arabic Foods",
  "آداب الطعام": "Dining Etiquette",
  "حوار المطعم": "Restaurant Dialogue",
  
  // Colors and Shapes Unit
  "الألوان الأساسية": "Primary Colors",
  "الألوان الثانوية": "Secondary Colors",
  "درجات الألوان": "Color Shades",
  "المربع والمستطيل": "Square and Rectangle",
  "الدائرة والبيضاوي": "Circle and Oval",
  "المثلث والمعين": "Triangle and Rhombus",
  "الأشكال ثلاثية الأبعاد": "3D Shapes",
  "الألوان في الطبيعة": "Colors in Nature",
  "وصف الأشياء": "Describing Objects",
  "الألوان والمشاعر": "Colors and Emotions",
  "الرسم والتلوين": "Drawing and Coloring",
  "الأنماط والتصاميم": "Patterns and Designs",
  "لون ملابسك": "Color of Your Clothes",
  "ألوان العلم": "Flag Colors",
  "حوار الألوان": "Colors Dialogue",
  
  // Days and Months Unit
  "أيام الأسبوع": "Days of the Week",
  "الشهور الميلادية": "Gregorian Months",
  "الشهور الهجرية": "Islamic Months",
  "الفصول الأربعة": "Four Seasons",
  "الطقس والمناخ": "Weather and Climate",
  "المواعيد والجدول": "Appointments and Schedule",
  "الأعياد الإسلامية": "Islamic Holidays",
  "المناسبات العامة": "Public Occasions",
  "التقويم العربي": "Arabic Calendar",
  "التخطيط الأسبوعي": "Weekly Planning",
  "المواسم والزراعة": "Seasons and Agriculture",
  "أهم التواريخ": "Important Dates",
  "موعد الاجتماع": "Meeting Appointment",
  "تنظيم الوقت": "Time Management",
  "حوار المواعيد": "Appointments Dialogue",
  
  // Market Unit
  "أنواع المتاجر": "Types of Stores",
  "السؤال عن السعر": "Asking About Prices",
  "المفاوضة": "Negotiation",
  "العملات والنقود": "Currency and Money",
  "الدفع والفاتورة": "Payment and Receipt",
  "المقاسات والأحجام": "Sizes and Measurements",
  "الملابس والأقمشة": "Clothes and Fabrics",
  "الإلكترونيات": "Electronics",
  "البقالة والخضار": "Grocery and Produce",
  "المجوهرات والهدايا": "Jewelry and Gifts",
  "الضمان والاستبدال": "Warranty and Exchange",
  "التسوق الإلكتروني": "Online Shopping",
  "قائمة المشتريات": "Shopping List",
  "عروض وتخفيضات": "Sales and Discounts",
  "حوار السوق": "Market Dialogue",
  
  // Home Unit
  "غرف المنزل": "Rooms of the House",
  "غرفة النوم": "Bedroom",
  "غرفة المعيشة": "Living Room",
  "المطبخ": "Kitchen",
  "الحمام": "Bathroom",
  "غرفة الطعام": "Dining Room",
  "الحديقة والفناء": "Garden and Yard",
  "الأثاث الأساسي": "Basic Furniture",
  "الأجهزة المنزلية": "Home Appliances",
  "التنظيف والترتيب": "Cleaning and Organizing",
  "الديكور والزينة": "Decoration and Ornaments",
  "الجيران والحي": "Neighbors and Neighborhood",
  "صيانة المنزل": "Home Maintenance",
  "وصف المنزل": "Describing the House",
  "حوار المنزل": "House Dialogue",
  
  // Prayer Unit
  "أركان الإسلام": "Pillars of Islam",
  "الوضوء خطوة بخطوة": "Ablution Step by Step",
  "أوقات الصلاة": "Prayer Times",
  "حركات الصلاة": "Prayer Movements",
  "سورة الفاتحة": "Surah Al-Fatiha",
  "التشهد والتسليم": "Tashahhud and Tasleem",
  "أذكار الصباح": "Morning Supplications",
  "أذكار المساء": "Evening Supplications",
  "دعاء قبل النوم": "Supplication Before Sleep",
  "آداب المسجد": "Mosque Etiquette",
  "صلاة الجمعة": "Friday Prayer",
  "صلاة العيد": "Eid Prayer",
  "الصيام والإفطار": "Fasting and Breaking Fast",
  "الحج والعمرة": "Hajj and Umrah",
  "حوار الصلاة": "Prayer Dialogue",
  
  // Intermediate Level - Verbs Unit
  "الفعل الماضي": "Past Tense",
  "الفعل المضارع": "Present Tense",
  "فعل الأمر": "Imperative",
  "الفعل المجهول": "Passive Voice",
  "الأفعال الناقصة": "Defective Verbs",
  "كان وأخواتها": "Kana and Its Sisters",
  "إن وأخواتها": "Inna and Its Sisters",
  "الأفعال المتعدية": "Transitive Verbs",
  "الأفعال اللازمة": "Intransitive Verbs",
  "المصادر": "Verbal Nouns",
  "اسم الفاعل": "Active Participle",
  "اسم المفعول": "Passive Participle",
  "الفعل المزيد": "Augmented Verbs",
  "تصريف الأفعال": "Verb Conjugation",
  "تمارين الأفعال": "Verb Exercises",
  
  // Travel Unit
  "حجز التذاكر": "Booking Tickets",
  "في المطار": "At the Airport",
  "الجوازات والتأشيرات": "Passports and Visas",
  "على متن الطائرة": "On Board the Plane",
  "الأمتعة والحقائب": "Luggage and Bags",
  "الجمارك": "Customs",
  "استئجار سيارة": "Renting a Car",
  "وسائل النقل": "Transportation Modes",
  "السياحة والمعالم": "Tourism and Landmarks",
  "الخرائط والاتجاهات": "Maps and Directions",
  "مشاكل السفر": "Travel Problems",
  "التأمين والسلامة": "Insurance and Safety",
  "العملات والصرف": "Currency Exchange",
  "التواصل في السفر": "Communication While Traveling",
  "حوار المطار": "Airport Dialogue",
  
  // Nominal Sentences Unit
  "المبتدأ والخبر": "Subject and Predicate",
  "أنواع الخبر": "Types of Predicates",
  "تقديم الخبر": "Fronting the Predicate",
  "الجملة الاسمية المنفية": "Negative Nominal Sentence",
  "النواسخ": "Modifying Particles",
  "الضمائر المتصلة": "Attached Pronouns",
  "الضمائر المنفصلة": "Detached Pronouns",
  "أسماء الإشارة": "Demonstrative Pronouns",
  "الأسماء الموصولة": "Relative Pronouns",
  "الصفة والموصوف": "Adjective and Described",
  "المضاف والمضاف إليه": "Possessive Construction",
  "الحال": "Adverb of Manner",
  "التمييز": "Specification",
  "جمل التعجب": "Exclamatory Sentences",
  "تمارين الجملة الاسمية": "Nominal Sentence Exercises",
  
  // Hotel Unit
  "الحجز المسبق": "Advance Booking",
  "الوصول للفندق": "Arriving at the Hotel",
  "تسجيل الدخول": "Check-in",
  "أنواع الغرف": "Room Types",
  "الخدمات الفندقية": "Hotel Services",
  "الشكاوى والطلبات": "Complaints and Requests",
  "خدمة الغرف": "Room Service",
  "المرافق الفندقية": "Hotel Facilities",
  "تمديد الإقامة": "Extending Stay",
  "تسجيل الخروج": "Check-out",
  "الفاتورة والدفع": "Bill and Payment",
  "التقييم والمراجعة": "Rating and Review",
  "نصائح السفر": "Travel Tips",
  "أنواع الفنادق": "Types of Hotels",
  "حوار الفندق": "Hotel Dialogue",
  
  // Verbal Sentences Unit
  "الفعل والفاعل": "Verb and Subject",
  "المفعول به": "Direct Object",
  "المفعول المطلق": "Absolute Object",
  "المفعول لأجله": "Object of Purpose",
  "المفعول فيه": "Adverb of Time/Place",
  "المفعول معه": "Object of Accompaniment",
  "نائب الفاعل": "Deputy Subject",
  "الجملة الفعلية المنفية": "Negative Verbal Sentence",
  "الاستفهام": "Interrogation",
  "الشرط والجزاء": "Condition and Result",
  "التوكيد": "Emphasis",
  "العطف": "Conjunction",
  "البدل": "Apposition",
  "جمل معقدة": "Complex Sentences",
  "تمارين الجملة الفعلية": "Verbal Sentence Exercises",
  
  // Doctor Unit
  "أعضاء الجسم": "Body Parts",
  "الأعراض والأمراض": "Symptoms and Diseases",
  "وصف الألم": "Describing Pain",
  "عند الاستقبال": "At Reception",
  "الفحص الطبي": "Medical Examination",
  "التشخيص": "Diagnosis",
  "الوصفة الطبية": "Medical Prescription",
  "الصيدلية": "Pharmacy",
  "العمليات الجراحية": "Surgeries",
  "الطوارئ": "Emergency",
  "طب الأسنان": "Dentistry",
  "صحة العيون": "Eye Health",
  "الصحة النفسية": "Mental Health",
  "التأمين الصحي": "Health Insurance",
  "حوار الطبيب": "Doctor Dialogue",
  
  // Grammar Unit
  "علامات الإعراب": "Case Markers",
  "الرفع والنصب والجر": "Nominative, Accusative, Genitive",
  "المرفوعات": "Nominative Cases",
  "المنصوبات": "Accusative Cases",
  "المجرورات": "Genitive Cases",
  "الممنوع من الصرف": "Diptotes",
  "الأسماء الخمسة": "Five Nouns",
  "الأفعال الخمسة": "Five Verbs",
  "المثنى والجمع": "Dual and Plural",
  "جمع المذكر السالم": "Sound Masculine Plural",
  "جمع المؤنث السالم": "Sound Feminine Plural",
  "جمع التكسير": "Broken Plural",
  "الإعراب التقديري": "Estimated Case Endings",
  "الإعراب المحلي": "Local Case Endings",
  "تمارين النحو": "Grammar Exercises",
  
  // Transportation Unit
  "أنواع المواصلات": "Types of Transportation",
  "الباص والقطار": "Bus and Train",
  "سيارة الأجرة": "Taxi",
  "المترو": "Metro",
  "السفر بالطائرة": "Air Travel",
  "السفر بالسيارة": "Car Travel",
  "الاتجاهات": "Directions",
  "يميناً ويساراً": "Right and Left",
  "المسافات": "Distances",
  "الخرائط": "Maps",
  "إشارات المرور": "Traffic Signs",
  "قيادة السيارة": "Driving",
  "محطات الوقود": "Gas Stations",
  "السلامة المرورية": "Road Safety",
  "حوار المواصلات": "Transportation Dialogue",
  
  // Quranic Stories Unit
  "قصة آدم": "Story of Adam",
  "قصة نوح": "Story of Noah",
  "قصة إبراهيم": "Story of Abraham",
  "قصة موسى": "Story of Moses",
  "قصة يوسف": "Story of Joseph",
  "قصة داود": "Story of David",
  "قصة سليمان": "Story of Solomon",
  "قصة عيسى": "Story of Jesus",
  "أصحاب الكهف": "People of the Cave",
  "قصة مريم": "Story of Mary",
  "قصة أيوب": "Story of Job",
  "قصة يونس": "Story of Jonah",
  "قصة لقمان": "Story of Luqman",
  "العبر والدروس": "Lessons and Morals",
  "مفردات قرآنية": "Quranic Vocabulary",
  
  // News Unit
  "مفردات الأخبار": "News Vocabulary",
  "قراءة العناوين": "Reading Headlines",
  "الأخبار المحلية": "Local News",
  "الأخبار الدولية": "International News",
  "الأخبار الاقتصادية": "Economic News",
  "الأخبار الرياضية": "Sports News",
  "الطقس": "Weather",
  "التقارير الإخبارية": "News Reports",
  "المقابلات": "Interviews",
  "التحليل الإعلامي": "Media Analysis",
  "وسائل التواصل": "Social Media",
  "الصحافة المكتوبة": "Print Journalism",
  "الإذاعة والتلفزيون": "Radio and Television",
  "الإعلان والدعاية": "Advertising",
  "حوار إخباري": "News Dialogue",
  
  // Advanced Level - Rhetoric Unit
  "علم البيان": "Science of Expression",
  "التشبيه": "Simile",
  "الاستعارة": "Metaphor",
  "الكناية": "Metonymy",
  "علم المعاني": "Science of Meanings",
  "الخبر والإنشاء": "Statement and Command",
  "التقديم والتأخير": "Fronting and Delaying",
  "الإيجاز والإطناب": "Brevity and Elaboration",
  "علم البديع": "Science of Embellishment",
  "الطباق والمقابلة": "Antithesis and Comparison",
  "الجناس": "Paronomasia",
  "السجع": "Rhymed Prose",
  "تحليل الشعر": "Poetry Analysis",
  "تحليل النثر": "Prose Analysis",
  "تمارين البلاغة": "Rhetoric Exercises",
  
  // Business Unit
  "مفردات الأعمال": "Business Vocabulary",
  "الاجتماعات": "Meetings",
  "العروض التقديمية": "Presentations",
  "التفاوض": "Negotiation",
  "العقود والاتفاقيات": "Contracts and Agreements",
  "المراسلات التجارية": "Business Correspondence",
  "التسويق والمبيعات": "Marketing and Sales",
  "الاستيراد والتصدير": "Import and Export",
  "البنوك والتمويل": "Banking and Finance",
  "الاستثمار": "Investment",
  "ريادة الأعمال": "Entrepreneurship",
  "إدارة المشاريع": "Project Management",
  "الموارد البشرية": "Human Resources",
  "التجارة الإلكترونية": "E-commerce",
  "حوار تجاري": "Business Dialogue",
  
  // Advanced Grammar Unit
  "التوابع": "Apposition",
  "النعت": "Adjective",
  "التوكيد اللفظي": "Verbal Emphasis",
  "العطف بالحروف": "Conjunction with Particles",
  "البدل المطابق": "Matching Substitution",
  "المنادى": "Vocative",
  "الاستثناء": "Exception",
  "الحال المفردة": "Single Adverb",
  "الحال الجملة": "Clausal Adverb",
  "التمييز الملفوظ": "Expressed Specification",
  "التمييز الملحوظ": "Implied Specification",
  "الاشتغال": "Occupation",
  "التنازع": "Contention",
  "الإعراب الصعب": "Difficult Parsing",
  "تمارين متقدمة": "Advanced Exercises",
  
  // Politics Unit
  "النظام السياسي": "Political System",
  "الدولة والحكومة": "State and Government",
  "البرلمان والتشريع": "Parliament and Legislation",
  "الانتخابات": "Elections",
  "الأحزاب السياسية": "Political Parties",
  "الدبلوماسية": "Diplomacy",
  "العلاقات الدولية": "International Relations",
  "المنظمات الدولية": "International Organizations",
  "حقوق الإنسان": "Human Rights",
  "الحروب والسلام": "War and Peace",
  "الأمن القومي": "National Security",
  "الاقتصاد السياسي": "Political Economy",
  "الإعلام السياسي": "Political Media",
  "التحليل السياسي": "Political Analysis",
  "حوار سياسي": "Political Dialogue",
  
  // Writing Unit
  "الرسالة الرسمية": "Formal Letter",
  "الرسالة الشخصية": "Personal Letter",
  "التقرير": "Report",
  "المقال": "Essay",
  "السيرة الذاتية": "Resume",
  "خطاب التقديم": "Cover Letter",
  "محضر الاجتماع": "Meeting Minutes",
  "البحث الأكاديمي": "Academic Research",
  "التلخيص": "Summarization",
  "الاقتباس والتوثيق": "Citation and Documentation",
  "التدقيق اللغوي": "Proofreading",
  "أساليب الكتابة": "Writing Styles",
  "الكتابة الإبداعية": "Creative Writing",
  "كتابة المحتوى": "Content Writing",
  "تمارين الكتابة": "Writing Exercises",
  
  // Law Unit
  "مفردات قانونية": "Legal Vocabulary",
  "أنواع القانون": "Types of Law",
  "المحاكم": "Courts",
  "المحامي والقاضي": "Lawyer and Judge",
  "الدعوى القضائية": "Lawsuit",
  "الأدلة والشهادة": "Evidence and Testimony",
  "الحكم والاستئناف": "Verdict and Appeal",
  "العقوبات": "Penalties",
  "القانون المدني": "Civil Law",
  "القانون الجنائي": "Criminal Law",
  "قانون الأسرة": "Family Law",
  "القانون التجاري": "Commercial Law",
  "القانون الدولي": "International Law",
  "حقوق الملكية": "Property Rights",
  "حوار قانوني": "Legal Dialogue",
  
  // Poetry Unit
  "المعلقات": "The Mu'allaqat",
  "امرؤ القيس": "Imru' al-Qais",
  "عنترة بن شداد": "Antara ibn Shaddad",
  "البحور الشعرية": "Poetic Meters",
  "القافية والوزن": "Rhyme and Meter",
  "الشعر الجاهلي": "Pre-Islamic Poetry",
  "شعر الحماسة": "Heroic Poetry",
  "شعر الغزل": "Love Poetry",
  "شعر الرثاء": "Elegiac Poetry",
  "شعر المدح": "Panegyric Poetry",
  "شعر الهجاء": "Satirical Poetry",
  "الصور الشعرية": "Poetic Imagery",
  "تحليل القصيدة": "Poem Analysis",
  "حفظ الشعر": "Memorizing Poetry",
  "تمارين شعرية": "Poetry Exercises",
  
  // Science Unit
  "مفردات علمية": "Scientific Vocabulary",
  "الفيزياء": "Physics",
  "الكيمياء": "Chemistry",
  "الأحياء": "Biology",
  "الرياضيات": "Mathematics",
  "علوم الحاسوب": "Computer Science",
  "الذكاء الاصطناعي": "Artificial Intelligence",
  "الطب والصحة": "Medicine and Health",
  "الهندسة": "Engineering",
  "البيئة والمناخ": "Environment and Climate",
  "الفضاء والفلك": "Space and Astronomy",
  "الاختراعات": "Inventions",
  "البحث العلمي": "Scientific Research",
  "المصطلحات التقنية": "Technical Terms",
  "حوار علمي": "Scientific Dialogue",
  
  // Philosophy Unit
  "مدخل للفلسفة": "Introduction to Philosophy",
  "المنطق الأرسطي": "Aristotelian Logic",
  "الفلسفة الإسلامية": "Islamic Philosophy",
  "ابن سينا والفارابي": "Ibn Sina and Al-Farabi",
  "ابن رشد والغزالي": "Ibn Rushd and Al-Ghazali",
  "علم الكلام": "Islamic Theology",
  "الأخلاق والقيم": "Ethics and Values",
  "الميتافيزيقا": "Metaphysics",
  "نظرية المعرفة": "Epistemology",
  "الجماليات": "Aesthetics",
  "الفلسفة السياسية": "Political Philosophy",
  "فلسفة اللغة": "Philosophy of Language",
  "النقد والتفكير": "Criticism and Thinking",
  "المصطلحات الفلسفية": "Philosophical Terms",
  "حوار فلسفي": "Philosophical Dialogue",
  
  // Diplomacy Unit
  "مفردات دبلوماسية": "Diplomatic Vocabulary",
  "البروتوكول الدبلوماسي": "Diplomatic Protocol",
  "السفارات والقنصليات": "Embassies and Consulates",
  "المعاهدات الدولية": "International Treaties",
  "الأمم المتحدة": "United Nations",
  "جامعة الدول العربية": "Arab League",
  "المؤتمرات الدولية": "International Conferences",
  "الخطاب الدبلوماسي": "Diplomatic Speech",
  "حل النزاعات": "Conflict Resolution",
  "الوساطة والتحكيم": "Mediation and Arbitration",
  "العقوبات الدولية": "International Sanctions",
  "المساعدات الإنسانية": "Humanitarian Aid",
  "التعاون الدولي": "International Cooperation",
  "المراسم والبروتوكول": "Ceremonies and Protocol",
  "حوار دبلوماسي": "Diplomatic Dialogue",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { limit = 50, offset = 0 } = await req.json().catch(() => ({}));

    // Get the Fusha dialect
    const { data: dialect } = await supabase
      .from("dialects")
      .select("id")
      .eq("name", "Modern Standard Arabic")
      .single();

    if (!dialect) {
      return new Response(
        JSON.stringify({ error: "Dialect not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Get all lessons for Fusha that still have Arabic titles
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select(`
        id, title,
        units!inner(
          levels!inner(
            dialect_id
          )
        )
      `)
      .eq("units.levels.dialect_id", dialect.id)
      .range(offset, offset + limit - 1);

    if (lessonsError) {
      throw lessonsError;
    }

    const results: { id: string; oldTitle: string; newTitle: string; status: string }[] = [];

    // Filter only Arabic titles (not already translated)
    const arabicLessons = (lessons || []).filter(l => /[\u0600-\u06FF]/.test(l.title));
    
    if (arabicLessons.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "All lessons already translated", total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to translate titles
    const titlesToTranslate = arabicLessons.map(l => l.title);
    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: `Translate these Arabic lesson titles to English. Return ONLY a JSON array of English translations in the same order, no explanations:\n\n${JSON.stringify(titlesToTranslate)}`
        }]
      })
    });

    const aiData = await aiResponse.json();
    let translations: string[] = [];
    
    try {
      const content = aiData.choices?.[0]?.message?.content || "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      translations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      translations = [];
    }

    for (let i = 0; i < arabicLessons.length; i++) {
      const lesson = arabicLessons[i];
      const englishTitle = translations[i] || translationMap[lesson.title];
      
      if (englishTitle) {
        await supabase.from("lessons").update({ title: englishTitle }).eq("id", lesson.id);
        results.push({ id: lesson.id, oldTitle: lesson.title, newTitle: englishTitle, status: "translated" });
      } else {
        results.push({ id: lesson.id, oldTitle: lesson.title, newTitle: lesson.title, status: "no_translation" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: arabicLessons.length,
        translated: results.filter(r => r.status === "translated").length,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
