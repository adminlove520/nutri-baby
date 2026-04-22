import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Simplified WHO Standards Data (0-12 months for demo)
const standards = [
    // Boys Length (cm)
    { source: 'WHO', type: 'height', gender: 'male', month: 0, p3: 46.1, p15: 48.0, p50: 49.9, p85: 51.8, p97: 53.7 },
    { source: 'WHO', type: 'height', gender: 'male', month: 1, p3: 50.8, p15: 52.8, p50: 54.7, p85: 56.7, p97: 58.6 },
    { source: 'WHO', type: 'height', gender: 'male', month: 2, p3: 54.4, p15: 56.4, p50: 58.4, p85: 60.4, p97: 62.4 },
    { source: 'WHO', type: 'height', gender: 'male', month: 3, p3: 57.3, p15: 59.3, p50: 61.4, p85: 63.5, p97: 65.5 },
    { source: 'WHO', type: 'height', gender: 'male', month: 4, p3: 59.7, p15: 61.8, p50: 63.9, p85: 66.0, p97: 68.0 },
    { source: 'WHO', type: 'height', gender: 'male', month: 5, p3: 61.7, p15: 63.8, p50: 65.9, p85: 68.0, p97: 70.1 },
    { source: 'WHO', type: 'height', gender: 'male', month: 6, p3: 63.3, p15: 65.5, p50: 67.6, p85: 69.8, p97: 71.9 },
    { source: 'WHO', type: 'height', gender: 'male', month: 12, p3: 71.0, p15: 73.4, p50: 75.7, p85: 78.1, p97: 80.5 },

    // Girls Length (cm)
    { source: 'WHO', type: 'height', gender: 'female', month: 0, p3: 45.4, p15: 47.3, p50: 49.1, p85: 51.0, p97: 52.9 },
    { source: 'WHO', type: 'height', gender: 'female', month: 1, p3: 49.8, p15: 51.7, p50: 53.7, p85: 55.6, p97: 57.6 },
    { source: 'WHO', type: 'height', gender: 'female', month: 2, p3: 53.2, p15: 55.2, p50: 57.1, p85: 59.1, p97: 61.1 },
    { source: 'WHO', type: 'height', gender: 'female', month: 3, p3: 55.8, p15: 57.9, p50: 59.8, p85: 61.8, p97: 64.0 },
    { source: 'WHO', type: 'height', gender: 'female', month: 4, p3: 58.0, p15: 60.1, p50: 62.1, p85: 64.1, p97: 66.2 },
    { source: 'WHO', type: 'height', gender: 'female', month: 5, p3: 59.9, p15: 62.1, p50: 64.0, p85: 66.0, p97: 68.2 },
    { source: 'WHO', type: 'height', gender: 'female', month: 6, p3: 61.2, p15: 63.5, p50: 65.7, p85: 67.8, p97: 70.0 },
    { source: 'WHO', type: 'height', gender: 'female', month: 12, p3: 68.9, p15: 71.4, p50: 74.0, p85: 76.5, p97: 79.2 },

    // Boys Weight (kg)
    { source: 'WHO', type: 'weight', gender: 'male', month: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 },
    { source: 'WHO', type: 'weight', gender: 'male', month: 1, p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.8 },
    { source: 'WHO', type: 'weight', gender: 'male', month: 2, p3: 4.3, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.1 },
    { source: 'WHO', type: 'weight', gender: 'male', month: 3, p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.2, p97: 8.0 },
    { source: 'WHO', type: 'weight', gender: 'male', month: 4, p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.9, p97: 8.7 },
    { source: 'WHO', type: 'weight', gender: 'male', month: 5, p3: 6.0, p15: 6.7, p50: 7.5, p85: 8.4, p97: 9.3 },
    { source: 'WHO', type: 'weight', gender: 'male', month: 6, p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.9, p97: 9.8 },
    { source: 'WHO', type: 'weight', gender: 'male', month: 12, p3: 7.7, p15: 8.6, p50: 9.6, p85: 10.8, p97: 12.0 },

    // Girls Weight (kg)
    { source: 'WHO', type: 'weight', gender: 'female', month: 0, p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 },
    { source: 'WHO', type: 'weight', gender: 'female', month: 1, p3: 3.2, p15: 3.6, p50: 4.2, p85: 4.8, p97: 5.5 },
    { source: 'WHO', type: 'weight', gender: 'female', month: 2, p3: 3.9, p15: 4.5, p50: 5.1, p85: 5.8, p97: 6.6 },
    { source: 'WHO', type: 'weight', gender: 'female', month: 3, p3: 4.5, p15: 5.2, p50: 5.8, p85: 6.6, p97: 7.5 },
    { source: 'WHO', type: 'weight', gender: 'female', month: 4, p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.3, p97: 8.2 },
    { source: 'WHO', type: 'weight', gender: 'female', month: 5, p3: 5.4, p15: 6.1, p50: 6.9, p85: 7.8, p97: 8.8 },
    { source: 'WHO', type: 'weight', gender: 'female', month: 6, p3: 5.7, p15: 6.5, p50: 7.3, p85: 8.2, p97: 9.3 },
    { source: 'WHO', type: 'weight', gender: 'female', month: 12, p3: 7.0, p15: 7.9, p50: 8.9, p85: 10.1, p97: 11.5 },
]

const vaccineTemplates = [
    { vaccineName: '乙肝疫苗', vaccineType: '乙肝', description: '第1剂', ageInMonths: 0, doseNumber: 1, isRequired: true },
    { vaccineName: '卡介苗', vaccineType: '卡介苗', description: '出生接种', ageInMonths: 0, doseNumber: 1, isRequired: true },
    { vaccineName: '乙肝疫苗', vaccineType: '乙肝', description: '第2剂', ageInMonths: 1, doseNumber: 2, isRequired: true },
    { vaccineName: '脊灰疫苗', vaccineType: '脊灰', description: '第1剂', ageInMonths: 2, doseNumber: 1, isRequired: true },
    { vaccineName: '百白破疫苗', vaccineType: '百白破', description: '第1剂', ageInMonths: 3, doseNumber: 1, isRequired: true },
    { vaccineName: '脊灰疫苗', vaccineType: '脊灰', description: '第2剂', ageInMonths: 3, doseNumber: 2, isRequired: true },
    { vaccineName: '百白破疫苗', vaccineType: '百白破', description: '第2剂', ageInMonths: 4, doseNumber: 2, isRequired: true },
    { vaccineName: '脊灰疫苗', vaccineType: '脊灰', description: '第3剂', ageInMonths: 4, doseNumber: 3, isRequired: true },
    { vaccineName: '百白破疫苗', vaccineType: '百白破', description: '第3剂', ageInMonths: 5, doseNumber: 3, isRequired: true },
    { vaccineName: '乙肝疫苗', vaccineType: '乙肝', description: '第3剂', ageInMonths: 6, doseNumber: 3, isRequired: true },
    { vaccineName: 'A群流脑多糖疫苗', vaccineType: '流脑', description: '第1剂', ageInMonths: 6, doseNumber: 1, isRequired: true },
    { vaccineName: '脊灰疫苗', vaccineType: '脊灰', description: '第4剂', ageInMonths: 48, doseNumber: 4, isRequired: true },
]

const expertTips = [
    { title: '尝试俯卧时间 (Tummy Time)', content: '出生后即可开始，每天2-3次，每次3-5分钟，帮助锻炼颈部肌肉。', category: 'development', minAgeMonth: 0, maxAgeMonth: 3 },
    { title: '建立睡眠程序', description: '固定的洗澡、读书、喂奶顺序可以帮助宝宝理解即将进入睡眠。', category: 'sleep', minAgeMonth: 2, maxAgeMonth: 12 },
    { title: '观察饥饿信号', description: '寻乳反射、吸吮手指是早期信号，哭闹通常是晚期信号。', category: 'feeding', minAgeMonth: 0, maxAgeMonth: 6 },
    { title: '开始尝试辅食', description: '通常在6个月左右，当宝宝能坐稳且对食物感兴趣时开始。', category: 'feeding', minAgeMonth: 4, maxAgeMonth: 8 },
]

async function main() {
    console.log('Start seeding growth standards...')
    for (const s of standards) {
        await prisma.growthStandard.upsert({
            where: {
                source_type_gender_month: {
                    source: s.source,
                    type: s.type,
                    gender: s.gender,
                    month: s.month
                }
            },
            update: s,
            create: s
        })
    }

    console.log('Start seeding vaccine templates...')
    await prisma.vaccinePlanTemplate.deleteMany()
    for (const v of vaccineTemplates) {
        await prisma.vaccinePlanTemplate.create({
            data: v
        })
    }

    console.log('Start seeding expert tips...')
    for (const t of expertTips) {
        await prisma.expertTip.create({
            data: {
                title: t.title,
                content: (t as any).description || t.content,
                category: t.category,
                minAgeMonth: t.minAgeMonth,
                maxAgeMonth: t.maxAgeMonth,
                source: 'Expert'
            }
        })
    }

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
