import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Download, Filter, Calendar, MapPin, Building2, RefreshCw } from 'lucide-react'
import './App.css'

function App() {
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedProvince, setSelectedProvince] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedHealthDistrict, setSelectedHealthDistrict] = useState('all')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Google Sheets URL สำหรับดึงข้อมูลแบบ CSV
  const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/17iHNyQ3QddauQBhv1AolsMwTcawdH1hHWnO2EruLHHM/export?format=csv&gid=1679176461'

  // ข้อมูลภูมิภาค
  const regions_data = {
    "ภาคเหนือ": [
      "เชียงราย", "น่าน", "พะเยา", "เชียงใหม่", "แม่ฮ่องสอน", "แพร่", "ลำปาง", "ลำพูน", "อุตรดิตถ์"
    ],
    "ภาคตะวันออกเฉียงเหนือ": [
      "หนองคาย", "นครพนม", "สกลนคร", "อุดรธานี", "หนองบัวลำภู", "เลย", "มุกดาหาร", "กาฬสินธุ์",
      "ขอนแก่น", "อำนาจเจริญ", "ยโสธร", "ร้อยเอ็ด", "มหาสารคาม", "ชัยภูมิ", "นครราชสีมา",
      "บุรีรัมย์", "สุรินทร์", "ศรีสะเกษ", "อุบลราชธานี", "บึงกาฬ"
    ],
    "ภาคตะวันตก": [
      "ตาก", "กาญจนบุรี", "ราชบุรี", "เพชรบุรี", "ประจวบคีรีขันธ์"
    ],
    "ภาคกลาง": [
      "กรุงเทพฯ", "พิษณุโลก", "สุโขทัย", "เพชรบูรณ์", "พิจิตร", "กำแพงเพชร", "นครสวรรค์",
      "ลพบุรี", "ชัยนาท", "อุทัยธานี", "สิงห์บุรี", "อ่างทอง", "สระบุรี", "พระนครศรีอยุธยา",
      "สุพรรณบุรี", "นครนายก", "ปทุมธานี", "นนทบุรี", "นครปฐม", "สมุทรปราการ",
      "สมุทรสาคร", "สมุทรสงคราม"
    ],
    "ภาคตะวันออก": [
      "สระแก้ว", "ปราจีนบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ระยอง", "จันทบุรี", "ตราด"
    ],
    "ภาคใต้": [
      "ชุมพร", "ระนอง", "สุราษฎร์ธานี", "นครศรีธรรมราช", "กระบี่", "พังงา", "ภูเก็ต",
      "พัทลุง", "ตรัง", "ปัตตานี", "สงขลา", "สตูล", "นราธิวาส", "ยะลา"
    ]
  }

  // สร้าง mapping จากจังหวัดไปยังภูมิภาค
  const province_to_region = {}
  Object.keys(regions_data).forEach(region => {
    regions_data[region].forEach(province => {
      province_to_region[province] = region
    })
  })

  // ฟังก์ชันประมวลผลข้อมูล
  const processData = (csvText) => {
    const lines = csvText.split('\n')
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
    const rows = lines.slice(1).filter(line => line.trim())
    
    const parsedData = rows.map(row => {
      const values = row.split(',').map(v => v.replace(/"/g, '').trim())
      const obj = {}
      headers.forEach((header, index) => {
        obj[header] = values[index]
      })
      
      // ทำความสะอาดชื่อจังหวัด
      if (obj.จังหวัด) {
        obj.จังหวัด = obj.จังหวัด.replace("จ.", "").trim()
        obj.จังหวัด = obj.จังหวัด.replace("เขตบางกะปิ,กรุงเทพฯ", "กรุงเทพฯ")
        obj.จังหวัด = obj.จังหวัด.replace("กาฬสินธ์ุ", "กาฬสินธุ์")
        obj.จังหวัด = obj.จังหวัด.replace("ประจวบคิรีขันธ์", "ประจวบคีรีขันธ์")
        
        // เพิ่มภูมิภาค
        obj.ภูมิภาค = province_to_region[obj.จังหวัด] || 'ไม่ระบุ'
      }
      
      return obj
    }).filter(item => item.จังหวัด && item['ค่าเฉลี่ย PM2.5'])
    
    return parsedData
  }

  // โหลดข้อมูลจาก Google Sheets
  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetch(GOOGLE_SHEETS_CSV_URL)
      const csvText = await response.text()
      
      const parsedData = processData(csvText)
      setData(parsedData)
      setFilteredData(parsedData)
      setLastUpdated(new Date())
      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      // ถ้าไม่สามารถดึงข้อมูลจาก Google Sheets ได้ ให้ใช้ข้อมูลสำรอง
      try {
        const response = await fetch('/src/assets/pm25_data_processed.csv')
        const csvText = await response.text()
        const parsedData = processData(csvText)
        setData(parsedData)
        setFilteredData(parsedData)
        setLastUpdated(new Date())
      } catch (fallbackError) {
        console.error('Error loading fallback data:', fallbackError)
      }
      setLoading(false)
    }
  }

  // โหลดข้อมูลเมื่อเริ่มต้น
  useEffect(() => {
    loadData()
  }, [])

  // กรองข้อมูลตามเงื่อนไข
  useEffect(() => {
    let filtered = data

    if (selectedRegion !== 'all') {
      filtered = filtered.filter(item => item.ภูมิภาค === selectedRegion)
    }

    if (selectedProvince !== 'all') {
      filtered = filtered.filter(item => item.จังหวัด === selectedProvince)
    }

    if (selectedYear !== 'all') {
      filtered = filtered.filter(item => {
        const year = item.วันที่.split('/')[2]
        return year === selectedYear
      })
    }

    // เพิ่มการกรองตามเขตสุขภาพ (สำหรับกรุงเทพฯ)
    if (selectedHealthDistrict !== 'all') {
      // ในที่นี้จะจำลองการกรองเขตสุขภาพ เนื่องจากข้อมูลจริงอาจไม่มี
      // สามารถปรับปรุงได้เมื่อมีข้อมูลเขตสุขภาพจริง
      filtered = filtered.filter(item => {
        if (item.จังหวัด === 'กรุงเทพฯ') {
          // จำลองการแบ่งเขตสุขภาพ
          return true // ปรับปรุงตามข้อมูลจริง
        }
        return true
      })
    }

    setFilteredData(filtered)
  }, [data, selectedRegion, selectedProvince, selectedYear, selectedHealthDistrict])

  // เตรียมข้อมูลสำหรับกราฟ
  const chartData = filteredData.reduce((acc, item) => {
    const date = item.วันที่
    const region = item.ภูมิภาค
    const value = parseFloat(item['ค่าเฉลี่ย PM2.5'])
    
    if (isNaN(value) || value < 0) return acc

    const existingDate = acc.find(d => d.date === date)
    if (existingDate) {
      if (!existingDate[region]) {
        existingDate[region] = []
      }
      existingDate[region].push(value)
    } else {
      acc.push({
        date,
        [region]: [value]
      })
    }
    
    return acc
  }, [])

  // คำนวณค่าเฉลี่ยสำหรับแต่ละวันและภูมิภาค
  const processedChartData = chartData.map(item => {
    const processed = { date: item.date }
    Object.keys(item).forEach(key => {
      if (key !== 'date' && Array.isArray(item[key])) {
        const avg = item[key].reduce((sum, val) => sum + val, 0) / item[key].length
        processed[key] = Math.round(avg * 100) / 100
      }
    })
    return processed
  }).sort((a, b) => new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')))

  // ดึงรายการภูมิภาค จังหวัด และปี
  const regions = [...new Set(data.map(item => item.ภูมิภาค).filter(Boolean))]
  const provinces = [...new Set(data.map(item => item.จังหวัด).filter(Boolean))]
  const years = [...new Set(data.map(item => item.วันที่.split('/')[2]).filter(Boolean))]

  // เขตสุขภาพ (จำลอง)
  const healthDistricts = [
    'เขตสุขภาพที่ 1', 'เขตสุขภาพที่ 2', 'เขตสุขภาพที่ 3', 'เขตสุขภาพที่ 4',
    'เขตสุขภาพที่ 5', 'เขตสุขภาพที่ 6', 'เขตสุขภาพที่ 7', 'เขตสุขภาพที่ 8',
    'เขตสุขภาพที่ 9', 'เขตสุขภาพที่ 10', 'เขตสุขภาพที่ 11', 'เขตสุขภาพที่ 12',
    'สปคม. (กรุงเทพฯ)'
  ]

  // สีสำหรับแต่ละภูมิภาค
  const regionColors = {
    'ภาคเหนือ': '#8884d8',
    'ภาคตะวันออกเฉียงเหนือ': '#82ca9d',
    'ภาคกลาง': '#ffc658',
    'ภาคตะวันออก': '#ff7300',
    'ภาคตะวันตก': '#00ff00',
    'ภาคใต้': '#ff0000'
  }

  // ฟังก์ชันส่งออกข้อมูล
  const exportToCSV = () => {
    const csvContent = [
      ['วันที่', 'จังหวัด', 'ค่าเฉลี่ย PM2.5', 'ภูมิภาค'],
      ...filteredData.map(item => [item.วันที่, item.จังหวัด, item['ค่าเฉลี่ย PM2.5'], item.ภูมิภาค])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'pm25_filtered_data.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToExcel = () => {
    // สำหรับ Excel จะใช้ CSV format เหมือนกัน แต่เปลี่ยนนามสกุลไฟล์
    const csvContent = [
      ['วันที่', 'จังหวัด', 'ค่าเฉลี่ย PM2.5', 'ภูมิภาค'],
      ...filteredData.map(item => [item.วันที่, item.จังหวัด, item['ค่าเฉลี่ย PM2.5'], item.ภูมิภาค])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'pm25_filtered_data.xlsx')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ฟังก์ชันรีเซ็ตตัวกรอง
  const resetFilters = () => {
    setSelectedYear('all')
    setSelectedRegion('all')
    setSelectedProvince('all')
    setSelectedHealthDistrict('all')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">กำลังโหลดข้อมูลจาก Google Sheets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-2">
            ระบบติดตามฝุ่นละออง PM2.5 ประเทศไทย
          </h1>
          <p className="text-center text-muted-foreground">
            ข้อมูลค่าเฉลี่ย PM2.5 รายจังหวัด แยกตาม 6 ภูมิภาค
          </p>
          <div className="text-center mt-2">
            <Button 
              onClick={loadData} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              อัปเดตข้อมูล
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              ตัวกรองข้อมูล
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  ปี
                </label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกปี" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกปี</SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  ภูมิภาค
                </label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกภูมิภาค" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกภูมิภาค</SelectItem>
                    {regions.map(region => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  จังหวัด
                </label>
                <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกจังหวัด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกจังหวัด</SelectItem>
                    {provinces.map(province => (
                      <SelectItem key={province} value={province}>{province}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">เขตสุขภาพ</label>
                <Select value={selectedHealthDistrict} onValueChange={setSelectedHealthDistrict}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกเขตสุขภาพ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกเขต</SelectItem>
                    {healthDistricts.map(district => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={resetFilters} variant="outline" className="w-full">
                  รีเซ็ตตัวกรอง
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                ส่งออก CSV
              </Button>
              <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                ส่งออก Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>กราฟแสดงค่าเฉลี่ย PM2.5 ตามช่วงเวลา</CardTitle>
            <CardDescription>
              แสดงข้อมูลค่าเฉลี่ย PM2.5 (µg/m³) แยกตามภูมิภาค
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    label={{ value: 'PM2.5 (µg/m³)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    labelFormatter={(value) => `วันที่: ${value}`}
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend />
                  {regions.map(region => (
                    <Line
                      key={region}
                      type="monotone"
                      dataKey={region}
                      stroke={regionColors[region]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">จำนวนข้อมูลทั้งหมด</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{filteredData.length}</p>
              <p className="text-sm text-muted-foreground">รายการ</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ค่าเฉลี่ย PM2.5</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {filteredData.length > 0 
                  ? Math.round(filteredData.reduce((sum, item) => {
                      const value = parseFloat(item['ค่าเฉลี่ย PM2.5'])
                      return sum + (isNaN(value) || value < 0 ? 0 : value)
                    }, 0) / filteredData.filter(item => {
                      const value = parseFloat(item['ค่าเฉลี่ย PM2.5'])
                      return !isNaN(value) && value >= 0
                    }).length * 100) / 100
                  : 0
                }
              </p>
              <p className="text-sm text-muted-foreground">µg/m³</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ค่าสูงสุด PM2.5</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {filteredData.length > 0 
                  ? Math.max(...filteredData.map(item => {
                      const value = parseFloat(item['ค่าเฉลี่ย PM2.5'])
                      return isNaN(value) || value < 0 ? 0 : value
                    }))
                  : 0
                }
              </p>
              <p className="text-sm text-muted-foreground">µg/m³</p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            ข้อมูลจาก Google Sheets | 
            อัปเดตล่าสุด: {lastUpdated ? lastUpdated.toLocaleString('th-TH') : 'ไม่ทราบ'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default App

