import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.locale('zh-cn')

export const formatDate = (date: string | Date, format = 'YYYY-MM-DD HH:mm:ss') => {
    return dayjs(date).utcOffset(8).format(format)
}

export const formatTime = (date: string | Date, format = 'YYYY-MM-DD HH:mm') => {
    return dayjs(date).utcOffset(8).format(format)
}

export const formatRelativeTime = (date: string | Date) => {
    return dayjs(date).utcOffset(8).fromNow()
}

export const formatRelative = (date: string | Date) => {
    return dayjs(date).utcOffset(8).fromNow()
}

export const calculateAge = (birthDate: string | Date) => {
    const birth = dayjs(birthDate).utcOffset(8)
    const now = dayjs().utcOffset(8)
    const diffMonths = now.diff(birth, 'month')

    if (diffMonths < 1) {
        const diffDays = now.diff(birth, 'day')
        return `${diffDays}天`
    } else if (diffMonths < 12) {
        return `${diffMonths}个月`
    } else {
        const years = Math.floor(diffMonths / 12)
        const months = diffMonths % 12
        return `${years}岁${months > 0 ? months + '个月' : ''}`
    }
}
