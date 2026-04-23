export interface VaccineTemplate {
    vaccineName: string;
    vaccineType: string;
    description: string;
    ageInMonths: number;
    doseNumber: number;
    isRequired: boolean;
    targetDisease?: string;
    tips?: string;
}

export const VACCINE_STANDARDS_2021: VaccineTemplate[] = [
    { vaccineName: '乙肝疫苗', vaccineType: '乙肝', description: '第1剂', ageInMonths: 0, doseNumber: 1, isRequired: true, targetDisease: '乙型肝炎', tips: '出生后24小时内尽快接种' },
    { vaccineName: '卡介苗', vaccineType: '卡介苗', description: '出生接种', ageInMonths: 0, doseNumber: 1, isRequired: true, targetDisease: '结核病', tips: '皮内注射，接种后会出现小红肿，属于正常反应' },
    { vaccineName: '乙肝疫苗', vaccineType: '乙肝', description: '第2剂', ageInMonths: 1, doseNumber: 2, isRequired: true, targetDisease: '乙型肝炎', tips: '与第1剂间隔1个月' },
    { vaccineName: '脊灰灭活疫苗(IPV)', vaccineType: '脊灰', description: '第1剂', ageInMonths: 2, doseNumber: 1, isRequired: true, targetDisease: '脊髓灰质炎（小儿麻痹症）', tips: '2021年新政：前两剂次均使用灭活疫苗' },
    { vaccineName: '脊灰灭活疫苗(IPV)', vaccineType: '脊灰', description: '第2剂', ageInMonths: 3, doseNumber: 2, isRequired: true, targetDisease: '脊髓灰质炎（小儿麻痹症）', tips: '与第1剂间隔1个月' },
    { vaccineName: '百白破疫苗', vaccineType: '百白破', description: '第1剂', ageInMonths: 3, doseNumber: 1, isRequired: true, targetDisease: '百日咳、白喉、破伤风', tips: '接种后可能出现发热或局部红肿，建议物理降温' },
    { vaccineName: '脊灰减毒活疫苗(bOPV)', vaccineType: '脊灰', description: '第3剂', ageInMonths: 4, doseNumber: 3, isRequired: true, targetDisease: '脊髓灰质炎（小儿麻痹症）', tips: '口服接种，接种前后半小时不要喂热水或母乳' },
    { vaccineName: '百白破疫苗', vaccineType: '百白破', description: '第2剂', ageInMonths: 4, doseNumber: 2, isRequired: true, targetDisease: '百日咳、白喉、破伤风', tips: '与第1剂间隔1个月' },
    { vaccineName: '百白破疫苗', vaccineType: '百白破', description: '第3剂', ageInMonths: 5, doseNumber: 3, isRequired: true, targetDisease: '百日咳、白喉、破伤风', tips: '与第2剂间隔1个月' },
    { vaccineName: '乙肝疫苗', vaccineType: '乙肝', description: '第3剂', ageInMonths: 6, doseNumber: 3, isRequired: true, targetDisease: '乙型肝炎', tips: '与第1剂间隔6个月' },
    { vaccineName: 'A群流脑多糖疫苗', vaccineType: '流脑', description: '第1剂', ageInMonths: 6, doseNumber: 1, isRequired: true, targetDisease: '流行性脑脊髓膜炎', tips: '注意观察是否有皮疹' },
    { vaccineName: '麻腮风疫苗', vaccineType: '麻腮风', description: '第1剂', ageInMonths: 8, doseNumber: 1, isRequired: true, targetDisease: '麻疹、腮腺炎、风疹', tips: '8月龄及时接种，预防冬春季高发传染病' },
    { vaccineName: '乙脑减毒活疫苗', vaccineType: '乙脑', description: '第1剂', ageInMonths: 8, doseNumber: 1, isRequired: true, targetDisease: '流行性乙型脑炎', tips: '预防蚊虫叮咬传播的脑炎' },
    { vaccineName: 'A群流脑多糖疫苗', vaccineType: '流脑', description: '第2剂', ageInMonths: 9, doseNumber: 2, isRequired: true, targetDisease: '流行性脑脊髓膜炎', tips: '与第1剂间隔3个月' },
    { vaccineName: '麻腮风疫苗', vaccineType: '麻腮风', description: '第2剂', ageInMonths: 18, doseNumber: 2, isRequired: true, targetDisease: '麻疹、腮腺炎、风疹', tips: '加强免疫，提供更持久保护' },
    { vaccineName: '百白破疫苗', vaccineType: '百白破', description: '第4剂', ageInMonths: 18, doseNumber: 4, isRequired: true, targetDisease: '百日咳、白喉、破伤风', tips: '1.5岁加强免疫' },
    { vaccineName: '甲肝减毒活疫苗', vaccineType: '甲肝', description: '第1剂', ageInMonths: 18, doseNumber: 1, isRequired: true, targetDisease: '甲型肝炎', tips: '单剂次减毒活疫苗' },
    { vaccineName: '乙脑减毒活疫苗', vaccineType: '乙脑', description: '第2剂', ageInMonths: 24, doseNumber: 2, isRequired: true, targetDisease: '流行性乙型脑炎', tips: '2周岁加强' },
    { vaccineName: 'A群C群流脑多糖疫苗', vaccineType: '流脑', description: '第1剂', ageInMonths: 36, doseNumber: 1, isRequired: true, targetDisease: '流行性脑脊髓膜炎', tips: '3周岁接种AC结合或多糖疫苗' },
    { vaccineName: '脊灰减毒活疫苗(bOPV)', vaccineType: '脊灰', description: '第4剂', ageInMonths: 48, doseNumber: 4, isRequired: true, targetDisease: '脊髓灰质炎（小儿麻痹症）', tips: '4周岁最后一次脊灰疫苗' },
    { vaccineName: '白破疫苗', vaccineType: '百白破', description: '第5剂(加强)', ageInMonths: 72, doseNumber: 5, isRequired: true, targetDisease: '白喉、破伤风', tips: '6周岁加强，不再包含百日咳成分' },
    { vaccineName: 'A群C群流脑多糖疫苗', vaccineType: '流脑', description: '第2剂', ageInMonths: 72, doseNumber: 2, isRequired: true, targetDisease: '流行性脑脊髓膜炎', tips: '6周岁加强' },
];
