create table if not exists components (
	id serial primary key,
	name varchar(100) not null unique,
	component_type varchar(50) not null,
	description text,
	created_at timestamp default current_timestamp
);

create table if not exists dependencies (
	id serial primary key,
	source_component_id integer not null references components(id) on delete cascade,
	target_component_id integer not null references components(id) on delete cascade,
	dependency_type varchar(30) not null default 'hard',
	source_handle varchar(30) not null default 'source-right',
	target_handle varchar(30) not null default 'target-left',
	created_at timestamp default current_timestamp,
	unique (source_component_id, target_component_id)
);
