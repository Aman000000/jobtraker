import React from 'react';
import { NavLink } from 'react-router-dom';
import { IoBarChartSharp } from 'react-icons/io5';
import { MdQueryStats } from 'react-icons/md';
import { FaWpforms } from 'react-icons/fa';
import { ImProfile } from 'react-icons/im';

const links = [
	{
		id: 1,
		text: 'stats',
		path: '/',
		icon: <IoBarChartSharp />,
	},
	{
		id: 2,
		text: 'all jobs',
		path: 'all-jobs',
		icon: <MdQueryStats />,
	},
	{
		id: 3,
		text: 'add job',
		path: 'add-job',
		icon: <FaWpforms />,
	},
	{
		id: 4,
		text: 'profile',
		path: 'profile',
		icon: <ImProfile />,
	},
];

const NavLinks = ({ toggleSidebar }) => {
	return (
		<div className='nav-links'>
			{links.map(link => {
				const { id, text, path, icon } = link;
				return (
					<NavLink
						key={id}
						to={path}
						onClick={toggleSidebar}
						className={({ isActive }) =>
							isActive ? 'nav-link active' : 'nav-link'
						}>
						<span className='icon'>{icon}</span>
						{text}
					</NavLink>
				);
			})}
		</div>
	);
};

export default NavLinks;
