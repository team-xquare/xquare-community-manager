const CATEGORIES = {
	'deployment-issue': {
		id: 'deployment-issue',
		name: '배포 문제',
		description: '배포 실패, 배포 지연 등',
		fields: [
			{ id: 'title', label: '문제 요약', type: 'short', required: true, maxLength: 200 },
			{ id: 'description', label: '상세 설명', type: 'long', required: true, maxLength: 2000 },
			{ id: 'project_name', label: '프로젝트명', type: 'short', required: true, maxLength: 100 },
			{ id: 'environment', label: '환경 (production/staging/development)', type: 'short', required: true, maxLength: 50 },
			{ id: 'deployment_time', label: '배포 시도 시각 (예: 2024-01-15 14:30)', type: 'short', required: true, maxLength: 100 },
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
			{ id: 'started_at', label: '장애 시작 시각 (예: 2024-01-15 14:30)', type: 'short', required: true, maxLength: 100 },
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
			{ id: 'response_time', label: '응답 시간 (예: 예상 1초, 실제 5초)', type: 'short', required: true, maxLength: 200 },
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
			{ id: 'resource_type', label: '리소스 타입 (CPU/Memory/Storage/Database)', type: 'short', required: true, maxLength: 100 },
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
			{ id: 'build_log_url', label: '빌드 로그 URL (선택사항)', type: 'short', required: false, maxLength: 500 },
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
			{ id: 'config_type', label: '설정 타입 (환경변수/도메인/데이터베이스/기타)', type: 'short', required: true, maxLength: 100 },
			{ id: 'current_config', label: '현재 설정 (선택사항)', type: 'short', required: false, maxLength: 500 },
		],
	},
	'general-inquiry': {
		id: 'general-inquiry',
		name: '기타 문의',
		description: '위 카테고리에 해당하지 않는 문의',
		fields: [
			{ id: 'title', label: '문의 제목', type: 'short', required: true, maxLength: 200 },
			{ id: 'description', label: '상세 내용', type: 'long', required: true, maxLength: 2000 },
			{ id: 'project_name', label: '프로젝트명 (선택사항)', type: 'short', required: false, maxLength: 100 },
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
	if (!category) {
		throw new Error(`Invalid category: ${categoryId}`);
	}

	const errors = [];

	category.fields.forEach(field => {
		const value = fieldData[field.id];

		if (field.required && (!value || value.trim().length === 0)) {
			errors.push(`${field.label}은(는) 필수 입력 항목입니다.`);
		}

		if (value && value.length > field.maxLength) {
			errors.push(`${field.label}은(는) 최대 ${field.maxLength}자까지 입력 가능합니다.`);
		}
	});

	if (errors.length > 0) {
		throw new Error(errors.join('\n'));
	}

	return true;
};

module.exports = {
	CATEGORIES,
	getCategoryById,
	getAllCategories,
	getCategoryChoices,
	validateCategoryFields,
};
