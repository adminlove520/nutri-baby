import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * 获取北京时间 (UTC+8) 的当前时间对象
 */
export const getBeijingNow = () => {
  return dayjs().utcOffset(8)
}

/**
 * 将任意日期转换为北京时间字符串
 */
export const formatBeijing = (date?: string | Date | number, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return ''
  return dayjs(date).utcOffset(8).format(format)
}

/**
 * 获取今日北京时间 0 点的 Date 对象
 */
export const getBeijingStartOfToday = () => {
  return dayjs().utcOffset(8).startOf('day').toDate()
}
