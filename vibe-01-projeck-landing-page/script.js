// 스크롤 시 섹션 페이드인
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll('.section').forEach((el) => {
  el.classList.add('fade-in');
  observer.observe(el);
});
