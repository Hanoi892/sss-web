function cleanText(text){
 if(/IMAGE.*ALT/s.test(text))return '사진 준비 중';
 const replacements=[
  ['하노이 새 업소 상세 허브','하노이 업소 더 살펴보기'],['나트랑 새 업소 상세 허브','나트랑 업소 더 살펴보기'],['VVS·런던 업소 카드','VVS·런던 가라오케 안내'],
  ['카테고리 메인글','업종별 안내'],['가라오케 메인글','가라오케 안내'],['불건마 메인글','불건마·마사지 안내'],['마사지 메인글','마사지 안내'],['같은 지역 메인글','같은 지역 안내'],['메인글','지역 안내'],
  ['업소별 상세 허브','업소별 안내'],['상세 허브','상세 안내'],['지역별 허브','지역별 안내'],['정보 허브','안내 페이지'],['카테고리 허브','지역·업종별 안내'],['업소 허브','업소 안내'],['허브','안내'],
  ['상세글 참조','상세 안내에서 확인'],['상세글','상세 안내'],['관련 업소 카드','관련 업소 안내'],['업소 카드','업소 안내'],
  ['상세한 검색 키워드와 시설·위치 정보','자세한 시설·위치 정보'],['주소·영업·시설·검색 관련 키워드','주소·영업시간·시설 정보'],['검색 관련 키워드','이용 정보'],['검색 키워드','이용 정보'],
  ['추가 FAQ','자주 묻는 질문'],['추가 확인 정보','위치와 시설 안내'],['총 5곳으로 확장했습니다','총 5곳을 안내합니다']
 ];
 for(const [from,to] of replacements)text=text.split(from).join(to);
 return text.replace(/\bIMAGE\s*·\s*ALT TEXT(?: READY)?\b/g,'사진 준비 중').replace(/^\s*IMAGE\s*$/g,'사진 준비 중').replace(/\bFAQ\b/g,'자주 묻는 질문');
}
function cleanPublicHtml(html){
 html=html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi,(all,attrs,body)=>{
  if(/ALT|알트 문구|대체 텍스트|이미지 영역을 유지|빈 영역을 유지|이미지에 연결할 예정/.test(body)){
   const keep=body.split(/(?<=\.)\s*/).filter(sentence=>!/ALT|알트 문구|대체 텍스트|이미지 영역을 유지|빈 영역을 유지|이미지에 연결할 예정/.test(sentence));
   return `<p${attrs}>${keep.join(' ')||'사진과 안내를 함께 참고해 업소의 공간 구성과 분위기를 살펴보세요.'}</p>`;
  }
  if(/아래 카드에는.*(?:업소명|이름).*표시|아래 카드에는.*업소명.*노출/.test(body))return `<p${attrs}>업소를 선택하면 주소와 영업시간, 시설 정보를 자세히 확인할 수 있습니다.</p>`;
  return all;
 });
 return html.split(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<[^>]+>)/gi).map(part=>part.startsWith('<')?part:cleanText(part)).join('');
}
module.exports={cleanPublicHtml,cleanText};
