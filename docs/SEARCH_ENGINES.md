# 네이버·Bing 검색 노출 및 등록 체크

기준 도메인: https://dongbamjeong.com/

## 사이트 공통 설정
- 검색엔진용 XML 사이트맵: https://dongbamjeong.com/sitemap.xml
- robots.txt: https://dongbamjeong.com/robots.txt (공개 페이지 수집 허용, /admin/ 제외)
- 모든 공개 페이지의 canonical: https://dongbamjeong.com/ 주소
- IndexNow 공개 인증 파일: https://dongbamjeong.com/7182c1395cfe391c4953ecd7795b1687.txt
- 코드 변경이 운영 main에 병합될 때 IndexNow를 통해 새로 발행·수정된 공개 페이지를 Bing과 네이버에 알림
- IndexNow 응답 200/202는 **제출 수신**만 뜻하며 검색 색인이나 순위는 보장하지 않음

## 네이버 서치어드바이저 (운영자 로그인·소유권 인증 필요)
1. https://searchadvisor.naver.com/ 에 로그인 → 웹마스터 도구 → 사이트 등록
2. 사이트 URL `https://dongbamjeong.com/` 등록
3. **HTML 태그** 방식 선택 후 발급된 `naver-site-verification` 값을 홈페이지 head에 삽입해야 소유확인 가능
4. 소유확인 후 '요청 → 사이트맵 제출'에서 `https://dongbamjeong.com/sitemap.xml` 제출
5. 사이트 진단, 수집 상태 및 검색 노출 보고서 확인

## Bing 웹마스터 도구 (운영자 로그인·소유권 인증 필요)
1. https://www.bing.com/webmasters/ 에 로그인
2. 구글 서치콘솔에서 https://dongbamjeong.com/ 소유권 확인이 완료된 경우 **Import from Google Search Console** 사용 권장
3. 가져오기 기능은 소유권 확인과 사이트맵 가져오기를 지원. 실패 시 Bing이 발급한 메타 태그 또는 DNS TXT로 별도 인증
4. Sitemaps 메뉴에서 `https://dongbamjeong.com/sitemap.xml` 상태 확인/제출
5. IndexNow 메뉴에서 수신 결과 및 URL 반영 상태 확인

## 주의
- 계정 소유권 인증·도구 대시보드 설정은 사이트 HTML 및 IndexNow 설정만으로 자동 완료되지 않습니다.
- 검색엔진이 해당 URL을 실제 크롤링·색인할지는 사이트 접근성과 자체 정책에 따릅니다.
