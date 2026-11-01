// Câu chữ cần được người hiểu kinh điển rà lại trước khi ra mắt.
// Bản "lược ý" là lời diễn lại ngắn cho dễ đọc, không phải nguyên văn bản dịch nào.
// `counted: true` nghĩa là mỗi dòng được tính một câu niệm chung của cả chùa.
export const SUTRAS = [
  {
    id: 'taisan',
    title: 'Tài lộc: Kinh Dīghajāṇu',
    note: 'Tăng Chi Bộ 8.54, lược ý. Phật dạy người tại gia giữ của và sống an vui',
    lines: [
      'Một thời, Đức Phật dạy người cư sĩ Dīghajāṇu',
      'về những điều đem lại an vui ngay trong đời này.',
      'Một là siêng năng,',
      'giỏi nghề mình làm, không lười biếng.',
      'Hai là khéo giữ gìn,',
      'của cải làm ra chân chính thì biết bảo vệ.',
      'Ba là có bạn lành,',
      'gần người có đức tin, giới hạnh, rộng rãi và trí tuệ.',
      'Bốn là sống cân bằng,',
      'thu chi vừa phải, không hoang phí, không keo kiệt.',
      'Của cải hao đi vì bốn đường:',
      'chơi bời, say sưa, cờ bạc, và thân với người xấu.',
      'Tránh bốn đường ấy, của cải được tăng thêm.',
      'Lại giữ niềm tin, giới hạnh, bố thí và trí tuệ,',
      'thì an vui cả đời này lẫn đời sau.'
    ]
  },
  {
    id: 'thantai',
    title: 'Tài lộc: Chân ngôn Hoàng Thần Tài',
    note: 'Chân ngôn của Jambhala trong Phật giáo Tây Tạng, 108 lần, trì kèm tâm bố thí',
    counted: true,
    lines: Array(108).fill('Om Jambhala Jalendraye Svaha')
  },
  {
    id: 'duocsu',
    title: 'Sức khỏe: Danh hiệu Dược Sư',
    note: 'Niệm danh hiệu Phật Dược Sư, 108 lần, cầu thân tâm an lành',
    counted: true,
    lines: Array(108).fill('Nam mô Dược Sư Lưu Ly Quang Vương Phật')
  },
  {
    id: 'thiensinh',
    title: 'Gia đạo: Kinh Thiện Sinh',
    note: 'Trường Bộ 31, lược ý phần cha mẹ, con cái và vợ chồng',
    lines: [
      'Đức Phật dạy chàng Thiện Sinh giữ đạo trong nhà.',
      'Làm con, hãy phụng dưỡng cha mẹ,',
      'gánh vác việc nhà, giữ gìn gia phong,',
      'sống xứng đáng với điều cha mẹ trao lại,',
      'và làm việc phước để hồi hướng cho cha mẹ.',
      'Làm cha mẹ, hãy ngăn con điều xấu,',
      'khuyên con điều lành, cho con học nghề,',
      'giúp con yên bề gia thất,',
      'và trao lại gia sản đúng lúc.',
      'Làm chồng, hãy kính trọng vợ, không coi thường,',
      'thủy chung, tin tưởng giao việc nhà,',
      'và biết tặng quà chăm chút cho vợ.',
      'Làm vợ, hãy lo liệu việc nhà chu đáo,',
      'đối đãi tốt với họ hàng hai bên,',
      'thủy chung, giữ gìn của cải chung,',
      'khéo léo và siêng năng.',
      'Trên dưới giữ đạo với nhau như thế,',
      'gia đạo được an ổn, không còn lo sợ.'
    ]
  },
  {
    id: 'samajivi',
    title: 'Tình yêu: Kinh Samajīvī',
    note: 'Tăng Chi Bộ 4.55, lược ý. Lời Phật dạy đôi vợ chồng Nakulapitā và Nakulamātā',
    lines: [
      'Đôi vợ chồng già đến thưa với Đức Phật:',
      'từ thuở trẻ đến nay, chúng con chưa từng phụ nhau,',
      'dù chỉ trong ý nghĩ.',
      'Xin cho đời này và đời sau vẫn được gặp nhau.',
      'Đức Phật dạy: muốn vậy, cả hai hãy giống nhau',
      'về niềm tin,',
      'về giới hạnh,',
      'về lòng rộng rãi,',
      'và về trí tuệ.',
      'Vợ chồng cùng sống đúng đạo,',
      'nói với nhau lời dễ thương,',
      'thì cùng nhau an vui.'
    ]
  },
  {
    id: 'tubi',
    title: 'Tình yêu: Kinh Từ Bi',
    note: 'Kinh Tập 1.8, lược ý. Nuôi tình thương không điều kiện',
    lines: [
      'Mong cho muôn loài được an vui.',
      'Yếu hay mạnh, lớn hay nhỏ,',
      'gần hay xa, đã sinh hay sắp sinh,',
      'mong tất cả đều an lành.',
      'Đừng ai lừa dối ai,',
      'đừng ai khinh thường ai,',
      'đừng vì giận hờn mà mong người khổ.',
      'Như người mẹ liều thân che chở đứa con một,',
      'hãy mở lòng thương đến tất cả,',
      'không ngăn cách, không oán thù.',
      'Khi đứng, khi đi, khi ngồi, khi nằm,',
      'hãy giữ tâm thương yêu ấy.'
    ]
  }
];
