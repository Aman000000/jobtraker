import React from 'react';
import { Outlet } from 'react-router-dom';

import { Navbar, SmallSidebar, BigSidebar, Chatbot } from '../../components';
import Wrapper from '../../assets/wrappers/SharedLayout';

const SharedLayout = () => {
	return (
		<Wrapper>
			<main className='dashboard'>
				<SmallSidebar />
				<BigSidebar />
				<div>
					<Navbar />
					<div className='dashboard-page'>
						<Outlet />
					</div>
				</div>
			</main>
			<Chatbot />
		</Wrapper>
	);
};

export default SharedLayout;
