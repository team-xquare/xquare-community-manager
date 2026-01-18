const ValidationError = require('@xquare/global/utils/errors/ValidationError');

const DATE_TIME_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\s([01]\d|2[0-3]):[0-5]\d$/;

const ERROR = {
	invalidCategory: '유효하지 않은 이슈 종류입니다.',
	required: label => `${label}은(는) 필수 입력 항목입니다.`,
	tooLong: (label, max) => `${label}은(는) 최대 ${max}자까지 입력 가능합니다.`,
	invalidFormat: label => `${label} 형식이 올바르지 않습니다.`,
};

const PATTERN_MESSAGE = {
	dateTime: '시각 형식은 YYYY-MM-DD HH:MM 입니다.',
};

const CATEGORIES = {
	'deployment-issue': {
		id: 'deployment-issue',
		name: '배포 문제',
		description: '배포 실패, 배포 지연 등',
		fields: [
			{ id: 'title', label: '문제 요약', type: 'short', required: true, maxLength: 200 },
			{ id: 'description', label: '상세 설명', type: 'long', required: true, maxLength: 2000 },
			{ id: 'project_name', label: '프로젝트명', type: 'short', required: true, maxLength: 100 },
			{ id: 'environment', label: '환경', type: 'short', required: true, maxLength: 50 },
			{
				id: 'deployment_time',
				label: '배포 시도 시각',
				type: 'short',
				required: true,
				maxLength: 100,
				pattern: DATE_TIME_PATTERN,
				patternMessage: PATTERN_MESSAGE.dateTime,
			},
		],
	},
	'service-outage': {
		id: 'service-outage',
		name: '서비스 장애',
		description: '서비스 다운, 접속 불가 등',
		fields: [
			{ id: 'title', label: '문제 요약', type: 'short', required: true, maxLength: 200 },
			{ id: 'description', label: '상세 설명', type: 'long', required: true, maxLength: 2000 },
			{ id: 'project_name', label: '프로젝트명', type: 'short', required: true, maxLength: 100 },
			{ id: 'affected_service', label: '영향받는 서비스', type: 'short', required: true, maxLength: 200 },
			{
				id: 'started_at',
				label: '장애 시작 시각',
				type: 'short',
				required: true,
				maxLength: 100,
				pattern: DATE_TIME_PATTERN,
				patternMessage: PATTERN_MESSAGE.dateTime,
			},
		],
	},
	'performance-issue': {
		id: 'performance-issue',
		name: '성능 문제',
		description: '느린 응답, 타임아웃 등',
		fields: [
			{ id: 'title', label: '문제 요약', type: 'short', required: true, maxLength: 200 },
			{ id: 'description', label: '상세 설명', type: 'long', required: true, maxLength: 2000 },
			{ id: 'project_name', label: '프로젝트명', type: 'short', required: true, maxLength: 100 },
			{ id: 'endpoint_or_page', label: '문제되는 엔드포인트/페이지', type: 'short', required: true, maxLength: 200 },
			{ id: 'response_time', label: '응답 시간', type: 'short', required: true, maxLength: 200 },
		],
	},
	'resource-request': {
		id: 'resource-request',
		name: '리소스 요청',
		description: 'CPU/메모리 증설, 스토리지 확장 등',
		fields: [
			{ id: 'title', label: '요청 내용', type: 'short', required: true, maxLength: 200 },
			{ id: 'description', label: '상세 설명', type: 'long', required: true, maxLength: 2000 },
			{ id: 'project_name', label: '프로젝트명', type: 'short', required: true, maxLength: 100 },
			{ id: 'resource_type', label: '리소스 타입', type: 'short', required: true, maxLength: 100 },
			{ id: 'specs', label: '현재 스펙 → 요청 스펙', type: 'short', required: true, maxLength: 200 },
		],
	},
	'build-failure': {
		id: 'build-failure',
		name: '빌드 오류',
		description: '빌드 실패, 의존성 문제 등',
		fields: [
			{ id: 'title', label: '문제 요약', type: 'short', required: true, maxLength: 200 },
			{ id: 'description', label: '상세 설명', type: 'long', required: true, maxLength: 2000 },
			{ id: 'project_name', label: '프로젝트명', type: 'short', required: true, maxLength: 100 },
			{ id: 'error_message', label: '에러 메시지', type: 'long', required: true, maxLength: 1000 },
			{ id: 'build_log_url', label: '빌드 로그 URL', type: 'short', required: false, maxLength: 500 },
		],
	},
	'configuration': {
		id: 'configuration',
		name: '설정 문제',
		description: '환경변수, 도메인, 데이터베이스 연결 등',
		fields: [
			{ id: 'title', label: '문제 요약', type: 'short', required: true, maxLength: 200 },
			{ id: 'description', label: '상세 설명', type: 'long', required: true, maxLength: 2000 },
			{ id: 'project_name', label: '프로젝트명', type: 'short', required: true, maxLength: 100 },
			{ id: 'config_type', label: '설정 타입', type: 'short', required: true, maxLength: 100 },
			{ id: 'current_config', label: '현재 설정', type: 'short', required: false, maxLength: 500 },
		],
	},
	'general-inquiry': {
		id: 'general-inquiry',
		name: '기타 문의',
		description: '위 카테고리에 해당하지 않는 문의',
		fields: [
			{ id: 'title', label: '문의 제목', type: 'short', required: true, maxLength: 200 },
			{ id: 'description', label: '상세 내용', type: 'long', required: true, maxLength: 2000 },
			{ id: 'project_name', label: '프로젝트명', type: 'short', required: false, maxLength: 100 },
		],
	},
};

const getCategoryById = categoryId => CATEGORIES[categoryId] || null;

const getAllCategories = () => Object.values(CATEGORIES);

const getCategoryChoices = () => getAllCategories().map(cat => ({
	label: cat.name,
	description: cat.description,
	value: cat.id,
}));

const validateCategoryFields = (categoryId, fieldData) => {
	const category = getCategoryById(categoryId);
	if (!category) throw new ValidationError(ERROR.invalidCategory, { userMessage: ERROR.invalidCategory });

	const errors = [];

	category.fields.forEach(field => {
		const value = fieldData[field.id];

		if (field.required && (!value || value.trim().length === 0)) errors.push(ERROR.required(field.label));

		if (value && value.length > field.maxLength) errors.push(ERROR.tooLong(field.label, field.maxLength));

		if (value && field.pattern && !field.pattern.test(value)) {
			errors.push(field.patternMessage || ERROR.invalidFormat(field.label));
		}
	});

	if (errors.length > 0) throw new ValidationError(errors.join('\n'), { userMessage: errors.join('\n') });

	return true;
};

module.exports = {
	CATEGORIES,
	getCategoryById,
	getAllCategories,
	getCategoryChoices,
	validateCategoryFields,
};
